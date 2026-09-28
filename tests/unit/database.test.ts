import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
// PostgreSQL engine for migration/RLS tests only. Production always uses Supabase.
const db = new PGlite();
const admin = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const vehicle = "33333333-3333-4333-8333-333333333333";
async function role(name: "anon" | "authenticated" | "postgres", user = "") {
  await db.exec(`reset role; set role ${name};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
}
beforeAll(async () => {
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema public,auth,storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  const migration = readFileSync(
    "supabase/migrations/202609250001_initial.sql",
    "utf8",
  ).replace("create extension if not exists pgcrypto;", "");
  await db.exec(migration);
  await db.exec(
    readFileSync(
      "supabase/migrations/202609250002_publication_integrity.sql",
      "utf8",
    ),
  );
  await db.query("insert into auth.users(id) values($1),($2)", [admin, other]);
  await db.query("insert into public.admin_users(user_id) values($1)", [admin]);
  await db.exec(
    readFileSync(
      "supabase/migrations/202609270001_staff_permissions.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/202609270002_contact_settings_only.sql",
      "utf8",
    ),
  );
  await db.query(
    "insert into public.vehicles(id,slug,brand,model,year_manufacture,year_model,price,mileage,status) values($1,'test-car','Test','Car',2023,2024,100000,20000,'draft')",
    [vehicle],
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/202609270003_inventory_pagination.sql",
      "utf8",
    ),
  );
  // Legacy sold record: its date is intentionally unknown after migration.
  await db.exec(
    "insert into public.vehicles(slug,brand,model,year_manufacture,year_model,price,mileage,status) values('legacy-sold','Legacy','Sold',2023,2024,25000,0,'sold')",
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/202609270004_lead_delete_sales_overview.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/202609270005_lead_abuse_protection.sql",
      "utf8",
    ),
  );
});
afterAll(async () => {
  await db.close();
});
describe("Operator demonstration seed safety", () => {
  it("changes only the eight named demos and restores snapshot enforcement", async () => {
    await role("postgres");
    const slugs = [
      "demo-fiat-argo-2023",
      "demo-hyundai-hb20-2022",
      "demo-volkswagen-polo-2024",
      "demo-chevrolet-onix-plus-2024",
      "demo-jeep-renegade-2022",
      "demo-nissan-kicks-2023",
      "demo-honda-city-2023",
      "demo-toyota-corolla-2022",
    ];
    await db.exec("begin");
    for (const slug of slugs) {
      const id = (
        await db.query<{ id: string }>(
          "insert into public.vehicles(slug,brand,model,version,description,year_manufacture,year_model,price,mileage,status) values($1,'Demo','Car','DEMONSTRAÇÃO','Veículo de demonstração',2023,2024,50000,0,'available') returning id",
          [slug],
        )
      ).rows[0].id;
      await db.query(
        "insert into storage.objects(bucket_id,name) values('vehicle-images',$1)",
        [id + "/demo.webp"],
      );
      await db.query(
        "insert into public.vehicle_images(vehicle_id,storage_path,is_cover) values($1,$2,true)",
        [id, id + "/demo.webp"],
      );
    }
    await db.exec("commit");
    const before = (
      await db.query("select status,price from public.vehicles where id=$1", [
        vehicle,
      ])
    ).rows[0];
    const seed = readFileSync("scripts/demo-sales.sql", "utf8");
    await db.exec(seed);
    expect(
      (
        await db.query(
          "select id from public.vehicles where slug=any($1) and status='sold' and sold_at<=now() and sold_advertised_price=price",
          [slugs],
        )
      ).rows,
    ).toHaveLength(8);
    expect(
      (
        await db.query("select status,price from public.vehicles where id=$1", [
          vehicle,
        ])
      ).rows[0],
    ).toEqual(before);
    expect(
      (
        await db.query<{ tgenabled: string }>(
          "select tgenabled from pg_trigger where tgname='capture_sold_snapshot'",
        )
      ).rows[0].tgenabled,
    ).toBe("O");
    await expect(db.exec(seed)).rejects.toThrow("Expected eight");
    await db.exec("rollback");
    await db.query("delete from public.vehicles where slug=any($1)", [slugs]);
    await db.exec("delete from storage.objects where name like '%/demo.webp'");
  });
});
describe("Sold advertised-price reporting", () => {
  it("rejects anonymous, non-stock and inactive readers", async () => {
    await role("anon");
    await expect(db.query("select public.sales_overview()")).rejects.toThrow();
    await role("authenticated", other);
    await expect(db.query("select public.sales_overview()")).rejects.toThrow();
  });
  it("preserves legacy unknown dates without attributing them to this month", async () => {
    await role("authenticated", admin);
    const all = (
      await db.query<{
        value: { count: number; total: number; undatedCount: number };
      }>("select public.sales_overview('all') value")
    ).rows[0].value;
    expect(all.count).toBe(1);
    expect(all.total).toBe(25000);
    expect(all.undatedCount).toBe(1);
    const month = (
      await db.query<{ value: { count: number } }>(
        "select public.sales_overview('month') value",
      )
    ).rows[0].value;
    expect(month.count).toBe(0);
    await db.exec("delete from public.vehicles where slug='legacy-sold'");
  });
  it("captures status changes, freezes price/date, prevents forgery and handles undo", async () => {
    await role("authenticated", admin);
    await db.query("update public.vehicles set status='sold' where id=$1", [
      vehicle,
    ]);
    const snapshot = (
      await db.query<{
        sold_at: string | null;
        sold_advertised_price: number | null;
      }>(
        "select sold_at,sold_advertised_price from public.vehicles where id=$1",
        [vehicle],
      )
    ).rows[0];
    expect(snapshot.sold_at).toBeTruthy();
    expect(Number(snapshot.sold_advertised_price)).toBe(100000);
    const row = (
      await db.query<Record<string, unknown>>(
        "select * from public.vehicles where id=$1",
        [vehicle],
      )
    ).rows[0];
    await db.query(
      "select public.save_vehicle($1::jsonb,'[]'::jsonb,'{}'::uuid[])",
      [JSON.stringify({ ...row, price: 105000 })],
    );
    expect(
      (
        await db.query(
          "select sold_at,sold_advertised_price from public.vehicles where id=$1",
          [vehicle],
        )
      ).rows[0],
    ).toEqual(snapshot);
    await db.query(
      "update public.vehicles set price=110000,sold_at='2000-01-01',sold_advertised_price=1 where id=$1",
      [vehicle],
    );
    expect(
      (
        await db.query(
          "select sold_at,sold_advertised_price from public.vehicles where id=$1",
          [vehicle],
        )
      ).rows[0],
    ).toEqual(snapshot);
    const report = (
      await db.query<{
        value: {
          count: number;
          total: number;
          average: number;
          monthly: { count: number; total: number }[];
        };
      }>("select public.sales_overview('month') value")
    ).rows[0].value;
    expect(report.count).toBe(1);
    expect(report.total).toBe(100000);
    expect(report.average).toBe(100000);
    expect(report.monthly).toHaveLength(6);
    expect(report.monthly.at(-1)?.count).toBe(1);
    await db.query("update public.vehicles set status='draft' where id=$1", [
      vehicle,
    ]);
    expect(
      (
        await db.query(
          "select sold_at,sold_advertised_price from public.vehicles where id=$1",
          [vehicle],
        )
      ).rows[0],
    ).toEqual({ sold_at: null, sold_advertised_price: null });
    await db.query("update public.vehicles set status='sold' where id=$1", [
      vehicle,
    ]);
    expect(
      Number(
        (
          await db.query<{ sold_advertised_price: number }>(
            "select sold_advertised_price from public.vehicles where id=$1",
            [vehicle],
          )
        ).rows[0].sold_advertised_price,
      ),
    ).toBe(110000);
    await db.query(
      "update public.vehicles set status='draft',price=100000 where id=$1",
      [vehicle],
    );
    await expect(
      db.query("select public.sales_overview('invalid')"),
    ).rejects.toThrow();
  });
});
describe("Sales calendar boundaries", () => {
  it("uses Brasília midnight and the last 30 calendar days", async () => {
    await role("postgres");
    // Backdated fixtures only in isolated PostgreSQL; application cannot forge dates.
    await db.exec(`alter table public.vehicles disable trigger capture_sold_snapshot;
      insert into public.vehicles(slug,brand,model,year_manufacture,year_model,price,mileage,status,sold_advertised_price,sold_at)
      values('boundary-before','Test','Before',2023,2024,100,0,'sold',100,(date_trunc('month',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')-interval '1 second'),
      ('boundary-at','Test','At',2023,2024,200,0,'sold',200,date_trunc('month',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
      set constraints all immediate; alter table public.vehicles enable trigger capture_sold_snapshot;`);
    await role("authenticated", admin);
    const month = (
      await db.query<{ value: { count: number; total: number } }>(
        "select public.sales_overview('month') value",
      )
    ).rows[0].value;
    expect(month.count).toBe(1);
    expect(month.total).toBe(200);
    await role("postgres");
    await db.exec(`alter table public.vehicles disable trigger capture_sold_snapshot;
      update public.vehicles set sold_at=(((now() at time zone 'America/Sao_Paulo')::date-29)::timestamp at time zone 'America/Sao_Paulo')-interval '1 second' where slug='boundary-before';
      update public.vehicles set sold_at=((now() at time zone 'America/Sao_Paulo')::date-29)::timestamp at time zone 'America/Sao_Paulo' where slug='boundary-at';
      set constraints all immediate; alter table public.vehicles enable trigger capture_sold_snapshot;`);
    await role("authenticated", admin);
    const last30 = (
      await db.query<{ value: { count: number; total: number } }>(
        "select public.sales_overview('30days') value",
      )
    ).rows[0].value;
    expect(last30.count).toBe(1);
    expect(last30.total).toBe(200);
    await db.exec("delete from public.vehicles where slug like 'boundary-%'");
  });
});
// These fixtures exist only inside the isolated PostgreSQL test engine.
describe("Bounded inventory with 10 and 1000 vehicles", () => {
  const page = async (
    filters = {},
    n = 1,
    size = 12,
    adminMode = false,
    options = false,
  ) => {
    const result = await db.query<{
      value: {
        total: number;
        page: number;
        pageSize: number;
        vehicles: Record<string, unknown>[];
      };
    }>("select public.inventory_page($1::jsonb,$2,$3,$4,$5) value", [
      JSON.stringify(filters),
      n,
      size,
      adminMode,
      options,
    ]);
    return result.rows[0].value;
  };
  const seed = async (first: number, last: number) => {
    await role("postgres");
    await db.exec(`begin;
      insert into public.vehicles(slug,brand,model,version,year_manufacture,year_model,price,mileage,status,description)
      select 'scale-'||n,'Citroën','Teste', 'Versão '||n,2023,2024,50000+n,n,'available',repeat('x',9000) from generate_series(${first},${last}) n;
      insert into storage.objects(bucket_id,name) select 'vehicle-images',id::text||'/scale.webp' from public.vehicles where slug like 'scale-%' and not exists(select 1 from public.vehicle_images i where i.vehicle_id=vehicles.id);
      insert into public.vehicle_images(vehicle_id,storage_path,is_cover) select id,id::text||'/scale.webp',true from public.vehicles where slug like 'scale-%' and not exists(select 1 from public.vehicle_images i where i.vehicle_id=vehicles.id);
      commit;`);
    await role("anon");
  };
  it("bounds photos/payload, reaches beyond 1000, preserves accent search and ordering", async () => {
    await seed(1, 10);
    const small = await page({ q: "citroen" });
    expect(small.total).toBe(10);
    expect(small.vehicles).toHaveLength(10);
    await seed(11, 1001);
    const large = await page({ q: "citroen", sort: "price_asc" });
    expect(large.total).toBe(1001);
    expect(large.vehicles).toHaveLength(12);
    expect(JSON.stringify(large).length).toBeLessThan(
      JSON.stringify(small).length * 1.3,
    );
    for (const car of large.vehicles) {
      expect(car.vehicle_images).toHaveLength(1);
      expect(car).not.toHaveProperty("description");
      expect(car).not.toHaveProperty("vehicle_features");
    }
    const second = await page({ q: "citroen", sort: "price_asc" }, 2);
    expect(
      second.vehicles.some((v) => large.vehicles.some((a) => a.id === v.id)),
    ).toBe(false);
    const last = await page({ q: "citroen", sort: "price_asc" }, 99999);
    expect(last.page).toBe(84);
    expect(last.vehicles).toHaveLength(5);
    expect(last.vehicles.at(-1)?.price).toBe(51001);
    const found = await page({ q: "versao 1001" }, 1, 12, false, true);
    expect(found.total).toBe(1);
    expect(found.vehicles[0]).not.toHaveProperty("vehicle_images");
    expect((await page({ q: "citroen" }, 1, 10000)).vehicles).toHaveLength(48);
    const facets = (
      await db.query<{ value: { model: string[]; version: string[] } }>(
        "select public.inventory_facets() value",
      )
    ).rows[0].value;
    expect(facets.model).toEqual([]);
    expect(facets.version).toEqual([]);
    await expect(page({}, 1, 12, true)).rejects.toThrow();
    await role("postgres");
    await db.exec("delete from public.vehicles where slug like 'scale-%'");
    await db.exec("delete from storage.objects where name like '%/scale.webp'");
  }, 30000);
});
describe("Supabase migration and RLS in PostgreSQL", () => {
  it("hides drafts from anonymous and nonadmin users", async () => {
    await role("anon");
    expect((await db.query("select * from public.vehicles")).rows).toHaveLength(
      0,
    );
    await role("authenticated", other);
    expect((await db.query("select * from public.vehicles")).rows).toHaveLength(
      0,
    );
    expect(
      (await db.query("select public.is_admin() as admin")).rows[0],
    ).toEqual({ admin: false });
  });
  it("prevents anonymous writes and member escalation", async () => {
    await role("anon");
    await expect(
      db.exec("update public.vehicles set status='available'"),
    ).rejects.toThrow();
    await role("authenticated", other);
    await expect(
      db.query("insert into public.admin_users(user_id) values($1)", [other]),
    ).rejects.toThrow();
    expect(
      (
        await db.exec(
          "update public.vehicles set status='available' returning id",
        )
      )[0].rows,
    ).toHaveLength(0);
  });
  it("persists plate final through the admin RPC and rejects invalid digits", async () => {
    await role("authenticated", admin);
    const { rows } = await db.query<Record<string, unknown>>(
      "select * from public.vehicles where id=$1",
      [vehicle],
    );
    const payload = { ...rows[0], plate_final: "8" };
    await db.query(
      "select public.save_vehicle($1::jsonb, '[]'::jsonb, '{}'::uuid[])",
      [JSON.stringify(payload)],
    );
    expect(
      (
        await db.query("select plate_final from public.vehicles where id=$1", [
          vehicle,
        ])
      ).rows[0],
    ).toEqual({ plate_final: "8" });
    await expect(
      db.query(
        "select public.save_vehicle($1::jsonb, '[]'::jsonb, '{}'::uuid[])",
        [JSON.stringify({ ...payload, plate_final: "AB8" })],
      ),
    ).rejects.toThrow();
  });
  it("allows admin to read drafts, and published rows become public", async () => {
    await role("authenticated", admin);
    expect((await db.query("select * from public.vehicles")).rows).toHaveLength(
      1,
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('vehicle-images',$1)",
      [`${vehicle}/test.jpg`],
    );
    await db.query(
      "insert into public.vehicle_images(vehicle_id,storage_path,is_cover) values($1,$2,true)",
      [vehicle, `${vehicle}/test.jpg`],
    );
    await db.query(
      "update public.vehicles set status='available' where id=$1",
      [vehicle],
    );
    await role("anon");
    expect((await db.query("select * from public.vehicles")).rows).toHaveLength(
      1,
    );
    expect(
      (await db.query("select * from public.vehicle_images")).rows,
    ).toHaveLength(1);
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      1,
    );
  });
  it("accepts public leads without allowing readback or status injection", async () => {
    await role("anon");
    const params = [
      "Pessoa teste",
      "11999991234",
      "teste@example.com",
      "contact",
      null,
      "Solicitação de teste",
      {},
    ];
    expect(
      (
        await db.query(
          "select public.submit_lead($1,$2,$3,$4,$5,$6,$7) as id",
          params,
        )
      ).rows,
    ).toHaveLength(1);
    await expect(db.query("select * from public.leads")).rejects.toThrow();
    await expect(
      db.query("select public.submit_lead($1,$2,$3,$4,$5,$6,$7)", params),
    ).rejects.toThrow(/Aguarde/);
    await role("authenticated", other);
    expect((await db.query("select * from public.leads")).rows).toHaveLength(0);
    await role("authenticated", admin);
    expect((await db.query("select status from public.leads")).rows[0]).toEqual(
      { status: "new" },
    );
  });
  it("enforces hourly phone and daily shared caps, then allows expired windows", async () => {
    await role("postgres");
    await db.exec("begin");
    try {
      await db.exec(
        "delete from public.leads; insert into public.leads(name,phone,email,type,created_at) select 'Test Person','11912345678','test@example.com','contact',now()-interval '10 minutes' from generate_series(1,5)",
      );
      await role("anon");
      await db.exec("savepoint rate_check");
      await expect(
        db.query(
          "select public.submit_lead('Test Person','11912345678','test@example.com','contact',null,'','{}')",
        ),
      ).rejects.toThrow(/Aguarde/);
      await db.exec("rollback to rate_check");
      await role("postgres");
      await db.exec(
        "update public.leads set created_at = now()-interval '2 hours'",
      );
      await role("anon");
      await expect(
        db.query(
          "select public.submit_lead('Test Person','11912345678','test@example.com','contact',null,'','{}')",
        ),
      ).resolves.toBeDefined();
      await role("postgres");
      await db.exec(
        "delete from public.leads; insert into public.leads(name,phone,email,type,created_at) select 'Test Person','11900000000','test@example.com','contact',now()-interval '2 hours' from generate_series(1,500)",
      );
      await role("anon");
      await db.exec("savepoint day_check");
      await expect(
        db.query(
          "select public.submit_lead('Test Person','11912345678','test@example.com','contact',null,'','{}')",
        ),
      ).rejects.toThrow(/Aguarde/);
      await db.exec("rollback to day_check");
      await role("postgres");
      await db.exec(
        "update public.leads set created_at=now()-interval '2 days'",
      );
      await role("anon");
      await expect(
        db.query(
          "select public.submit_lead('Test Person','11912345678','test@example.com','contact',null,'','{}')",
        ),
      ).resolves.toBeDefined();
    } finally {
      await db.exec("rollback; reset role");
    }
  });
  it("protects direct lead RPC against malformed JSON and rotating phones", async () => {
    await role("postgres");
    await db.exec("begin");
    try {
      await db.exec("delete from public.leads");
      await role("anon");
      for (let i = 0; i < 30; i++) {
        await db.query(
          "select public.submit_lead($1,$2,$3,'contact',null,'', '{}')",
          ["Test Person", String(11900000000 + i), "test@example.com"],
        );
      }
      await db.exec("savepoint rate_check");
      await expect(
        db.query(
          "select public.submit_lead('Test Person','11912345678','test@example.com','contact',null,'','{}')",
        ),
      ).rejects.toThrow(/Aguarde/);
      await db.exec("rollback to rate_check");
      await expect(
        db.query(
          "select public.submit_lead('Test Person','11912345678','test@example.com','contact',null,'','[]')",
        ),
      ).rejects.toThrow(/Confira/);
    } finally {
      await db.exec("rollback; reset role");
    }
  });
  it("hides unpublished photos and storage objects", async () => {
    await role("authenticated", admin);
    await db.query("update public.vehicles set status='hidden' where id=$1", [
      vehicle,
    ]);
    await role("anon");
    expect(
      (await db.query("select * from public.vehicle_images")).rows,
    ).toHaveLength(0);
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      0,
    );
  });
  it("atomically saves photos and optional features, rejects a missing photo", async () => {
    await role("authenticated", admin);
    const v = {
      id: vehicle,
      slug: "test-car",
      brand: "Test",
      model: "Car",
      version: "Test",
      year_manufacture: 2023,
      year_model: 2024,
      price: 100000,
      mileage: 20000,
      fuel: "Flex",
      transmission: "Automático",
      color: "Branco",
      body_type: "SUV",
      engine: "2.0",
      steering: "Elétrica",
      plate_final: "1",
      description: "Teste",
      status: "available",
      featured: true,
    };
    const { rows } = await db.query<{ id: string }>(
      "select id from public.features limit 1",
    );
    await db.query("select public.save_vehicle($1,$2,$3)", [
      v,
      [{ storage_path: `${vehicle}/test.jpg` }],
      [rows[0].id],
    ]);
    expect(
      (await db.query("select * from public.vehicle_features")).rows,
    ).toHaveLength(1);
    await expect(
      db.query("select public.save_vehicle($1,$2,$3)", [
        { ...v, brand: "Wrong" },
        [{ storage_path: "missing.jpg" }],
        [],
      ]),
    ).rejects.toThrow();
    expect(
      (await db.query("select brand from public.vehicles")).rows[0],
    ).toEqual({ brand: "Test" });
    await expect(
      db.query("select public.save_vehicle($1,$2,$3)", [v, [], []]),
    ).rejects.toThrow(/foto/);
  });
  it("rejects privileged RPC calls from ordinary authenticated users", async () => {
    await role("authenticated", other);
    await expect(
      db.query("select public.save_vehicle($1,$2,$3)", [{}, [], []]),
    ).rejects.toThrow(/Acesso negado/);
  });
  it("rejects deleting the published cover, even through direct table access", async () => {
    await role("authenticated", admin);
    await expect(
      db.query("delete from public.vehicle_images where vehicle_id=$1", [
        vehicle,
      ]),
    ).rejects.toThrow(/capa/);
    expect(
      (await db.query("select * from public.vehicle_images")).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query(
          "delete from storage.objects where bucket_id='vehicle-images' returning id",
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("cannot republish a record after its file was removed during a failed deletion", async () => {
    await role("authenticated", admin);
    await db.query("update public.vehicles set status='hidden' where id=$1", [
      vehicle,
    ]);
    await db.query(
      "delete from storage.objects where bucket_id='vehicle-images'",
    );
    await expect(
      db.query("update public.vehicles set status='available' where id=$1", [
        vehicle,
      ]),
    ).rejects.toThrow(/capa/);
    expect(
      (await db.query("select status from public.vehicles")).rows[0],
    ).toEqual({ status: "hidden" });
  });
});

describe("Staff permission enforcement against direct database access", () => {
  async function staff(permissions: string[], active = true) {
    await role("postgres");
    await db.query(
      "insert into public.admin_users(user_id,username,permissions,active) values($1,'staff',$2,$3) on conflict(user_id) do update set permissions=excluded.permissions,active=excluded.active",
      [other, permissions, active],
    );
    await role("authenticated", other);
  }
  it("keeps ownership and directory private and prevents self escalation", async () => {
    await staff([]);
    expect(
      (await db.query("select user_id from public.admin_users")).rows,
    ).toEqual([{ user_id: other }]);
    await expect(
      db.exec("update public.admin_users set is_owner=true"),
    ).rejects.toThrow();
    await expect(
      db.query("select public.save_vehicle($1,$2,$3)", [{}, [], []]),
    ).rejects.toThrow(/Acesso negado/);
    await role("authenticated", admin);
    expect(
      (await db.query("select user_id from public.admin_users")).rows,
    ).toHaveLength(2);
  });
  it("allows stock reading but denies writes, RPC and storage upload", async () => {
    await staff(["stock.read"]);
    expect(
      (await db.query("select id from public.vehicles")).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("update public.vehicles set mileage=0 returning id"))
        .rows,
    ).toHaveLength(0);
    await expect(
      db.query("select public.save_vehicle($1,$2,$3)", [{}, [], []]),
    ).rejects.toThrow(/Acesso negado/);
    await expect(
      db.exec(
        "insert into storage.objects(bucket_id,name) values('vehicle-images','unauthorized.jpg')",
      ),
    ).rejects.toThrow();
  });
  it("stock editor can write but cannot delete or change settings or leads", async () => {
    await staff(["stock.read", "stock.write"]);
    expect(
      (await db.query("update public.vehicles set mileage=22000 returning id"))
        .rows,
    ).toHaveLength(1);
    expect(
      (await db.query("delete from public.vehicles returning id")).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          "update public.site_settings set whatsapp='5511999999999' returning id",
        )
      ).rows,
    ).toHaveLength(0);
    expect((await db.query("select * from public.leads")).rows).toHaveLength(0);
    await db.exec(
      "insert into storage.objects(bucket_id,name) values('vehicle-images','staff-test.jpg')",
    );
    await expect(
      db.exec(
        "insert into storage.objects(bucket_id,name) values('site-assets','forbidden.jpg')",
      ),
    ).rejects.toThrow();
  });
  it("lead reader cannot update and lead writer can only change status", async () => {
    await staff(["leads.read"]);
    expect((await db.query("select * from public.leads")).rows).toHaveLength(1);
    expect(
      (
        await db.query(
          "update public.leads set status='contacted' returning id",
        )
      ).rows,
    ).toHaveLength(0);
    await staff(["leads.read", "leads.write"]);
    expect(
      (
        await db.query(
          "update public.leads set status='contacted' returning id",
        )
      ).rows,
    ).toHaveLength(1);
    await expect(
      db.exec("update public.leads set name='Tampered'"),
    ).rejects.toThrow();
    await expect(
      db.exec("update public.leads set consent_at=now()"),
    ).rejects.toThrow();
    expect(
      (await db.query("delete from public.leads returning id")).rows,
    ).toHaveLength(0);
    expect((await db.query("select * from public.vehicles")).rows).toHaveLength(
      0,
    );
  });
  it("settings access only edits contact channels and cannot upload institutional assets", async () => {
    await staff(["settings.write"]);
    expect(
      (
        await db.query(
          "update public.site_settings set instagram='https://www.instagram.com/testshop',facebook='https://www.facebook.com/testshop',whatsapp='5511999999999' returning id",
        )
      ).rows,
    ).toHaveLength(1);
    await expect(
      db.exec(
        "insert into storage.objects(bucket_id,name) values('site-assets','staff-site.jpg')",
      ),
    ).rejects.toThrow();
    await expect(
      db.exec("update public.site_settings set hero_title='Tampered'"),
    ).rejects.toThrow();
    await expect(
      db.exec(
        "insert into storage.objects(bucket_id,name) values('vehicle-images','forbidden.jpg')",
      ),
    ).rejects.toThrow();
  });
  it("revoking permissions or deactivating an account blocks an existing identity", async () => {
    await staff(["stock.read"]);
    expect((await db.query("select * from public.vehicles")).rows).toHaveLength(
      1,
    );
    await staff([]);
    expect((await db.query("select * from public.vehicles")).rows).toHaveLength(
      0,
    );
    await staff(
      [
        "stock.read",
        "stock.write",
        "stock.delete",
        "leads.read",
        "leads.write",
        "settings.write",
      ],
      false,
    );
    expect(
      (await db.query("select public.is_admin() as allowed")).rows[0],
    ).toEqual({ allowed: false });
    expect((await db.query("select * from public.leads")).rows).toHaveLength(0);
    await expect(
      db.query("select public.save_vehicle($1,$2,$3)", [{}, [], []]),
    ).rejects.toThrow(/Acesso negado/);
    expect(
      (
        await db.query(
          "update public.site_settings set whatsapp='5511999999999' returning id",
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("grants vehicle deletion only with explicit delete permission", async () => {
    await staff(["stock.read", "stock.write", "stock.delete"]);
    expect(
      (await db.query("delete from public.vehicles returning id")).rows,
    ).toHaveLength(1);
  });
});

describe("Institutional content stays locked even for owner", () => {
  it("rejects all non-contact columns and institutional storage writes", async () => {
    await role("postgres");
    await db.exec(
      "insert into storage.objects(bucket_id,name) values('site-assets','protected-logo.png')",
    );
    await role("authenticated", admin);
    for (const column of [
      "store_name",
      "logo",
      "hero_title",
      "hero_subtitle",
      "hero_image",
      "phone",
      "email",
      "address",
      "city",
      "business_hours",
    ]) {
      await expect(
        db.exec(`update public.site_settings set ${column}='changed'`),
      ).rejects.toThrow();
    }
    await expect(
      db.exec(
        "insert into storage.objects(bucket_id,name) values('site-assets','new-logo.png')",
      ),
    ).rejects.toThrow();
    expect(
      (
        await db.query(
          "delete from storage.objects where bucket_id='site-assets' returning id",
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          "update storage.objects set name='overwrite.png' where bucket_id='site-assets' returning id",
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          "update public.site_settings set facebook='https://www.facebook.com/owner' returning id",
        )
      ).rows,
    ).toHaveLength(1);
  });
});

describe("Explicit lead deletion permission", () => {
  it("protects deletion from readers, attendance, visitors and inactive accounts", async () => {
    await role("postgres");
    const id = "77777777-7777-4777-8777-777777777777";
    await db.query(
      "insert into public.leads(id,name,phone,email,type) values($1,'Delete Test','11999999999','delete@example.com','contact')",
      [id],
    );
    for (const [permissions, active] of [
      [["leads.read"], true],
      [["leads.read", "leads.write"], true],
      [["leads.read", "leads.delete"], false],
    ] as [string[], boolean][]) {
      await role("postgres");
      await db.query(
        "update public.admin_users set permissions=$1,active=$2 where user_id=$3",
        [permissions, active, other],
      );
      await role("authenticated", other);
      expect(
        (
          await db.query("delete from public.leads where id=$1 returning id", [
            id,
          ])
        ).rows,
      ).toHaveLength(0);
      await expect(
        db.query("select public.sales_overview()"),
      ).rejects.toThrow();
    }
    await role("anon");
    await expect(
      db.query("delete from public.leads where id=$1", [id]),
    ).rejects.toThrow();
    await role("postgres");
    await db.query(
      "update public.admin_users set permissions=array['leads.read','leads.delete'],active=true where user_id=$1",
      [other],
    );
    await role("authenticated", other);
    expect(
      (
        await db.query("delete from public.leads where id=$1 returning id", [
          id,
        ])
      ).rows,
    ).toEqual([{ id }]);
    expect(
      (
        await db.query("delete from public.leads where id=$1 returning id", [
          id,
        ])
      ).rows,
    ).toHaveLength(0);
    await role("postgres");
    await db.query(
      "update public.admin_users set permissions='{}',active=true where user_id=$1",
      [other],
    );
  });
});

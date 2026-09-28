"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Upload,
  ArrowLeft,
  ArrowRight,
  Star,
  Trash2,
  Save,
  Plus,
} from "lucide-react";
import { browserClient } from "@/lib/supabase/client";
import { saveVehicle } from "@/app/actions";
import { slugify } from "@/lib/utils";
import {
  statusLabels,
  type Vehicle,
  type VehicleImage,
  type Feature,
  type ActionResult,
} from "@/lib/types";
import { FormNotice } from "@/components/ui";
import { VehiclePlate } from "@/components/vehicle-plate";
import { prepareUploadBody } from "@/lib/upload-transport";
export function VehicleEditor({
  vehicle,
  features,
}: {
  vehicle?: Vehicle;
  features: Feature[];
}) {
  const [photos, setPhotos] = useState<VehicleImage[]>(
    vehicle?.vehicle_images || [],
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [plateFinal, setPlateFinal] = useState(vehicle?.plate_final || "");
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const folder = useRef(vehicle?.id || "");
  const original = useRef(vehicle?.vehicle_images || []);
  const [selected, setSelected] = useState(
    vehicle?.vehicle_features.map((f) => f.feature_id) || [],
  );
  const field = (
    name: keyof Vehicle,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label className="field" key={name}>
      {label}
      {required ? " *" : ""}
      <input
        name={name}
        type={type}
        defaultValue={String(vehicle?.[name] ?? "")}
        required={required}
        min={
          type === "number"
            ? name.startsWith("year_")
              ? 1900
              : name === "price"
                ? 1
                : 0
            : undefined
        }
        max={name.startsWith("year_") ? 2100 : undefined}
        step={name === "price" ? "0.01" : type === "number" ? "1" : undefined}
        maxLength={
          type === "text"
            ? name === "brand"
              ? 80
              : name === "model"
                ? 120
                : name === "version"
                  ? 180
                  : 60
            : undefined
        }
      />
    </label>
  );
  const select = (name: keyof Vehicle, label: string, options: string[]) => (
    <label className="field" key={name}>
      {label}
      <select name={name} defaultValue={String(vehicle?.[name] || "")}>
        <option value="">Selecione</option>
        {[
          ...new Set([
            ...options,
            ...(vehicle?.[name] ? [String(vehicle[name])] : []),
          ]),
        ].map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
  async function upload(files: FileList | File[] | null) {
    if (!files || uploading || pending) return;
    const list = Array.from(files);
    if (photos.length + list.length > 30) {
      setNotice({
        ok: false,
        message: "Você pode adicionar até 30 fotos por veículo.",
      });
      return;
    }
    setUploading(true);
    setNotice(null);
    if (!folder.current) folder.current = crypto.randomUUID();
    const errors: string[] = [];
    let processed = 0;
    let savedBytes = 0;
    let uploaded = 0;
    for (const file of list) {
      setUploadProgress(
        `Tratando e enviando foto ${++processed} de ${list.length}…`,
      );
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 10 * 1024 * 1024
      ) {
        errors.push(`${file.name}: use JPG, PNG ou WebP de até 10 MB.`);
        continue;
      }
      try {
        const body = await prepareUploadBody(file);
        const response = await fetch(
          `/api/admin/vehicle-image?folder=${folder.current}`,
          {
            method: "POST",
            body,
            headers: { "Content-Type": body.type },
          },
        );
        const data = await response
          .json()
          .catch(() => ({
            message: "Falha no envio. Tente uma foto menor ou envie novamente.",
          }));
        if (!response.ok) {
          errors.push(`${file.name}: ${data.message || "Falha ao enviar."}`);
          continue;
        }
        const path = data.storage_path;
        uploaded++;
        savedBytes += Math.max(0, file.size - data.bytes);
        setPhotos((p) => [
          ...p,
          {
            storage_path: path,
            position: p.length,
            is_cover: p.length === 0,
            url: data.url,
          },
        ]);
      } catch (error) {
        errors.push(
          `${file.name}: ${error instanceof Error ? error.message : "Falha ao preparar ou enviar a foto."}`,
        );
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    setUploadProgress("");
    setNotice({
      ok: !errors.length,
      message: [
        uploaded
          ? `${uploaded} foto(s) tratada(s) e enviada(s). Economia de ${(savedBytes / 1024 / 1024).toFixed(1)} MB. Salve o veículo para confirmar.`
          : "",
        ...errors,
      ]
        .filter(Boolean)
        .join(" "),
    });
  }
  const move = (from: number, to: number) =>
    setPhotos((p) => {
      const next = [...p];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  async function remove(index: number) {
    const photo = photos[index];
    if (!original.current.some((p) => p.storage_path === photo.storage_path)) {
      setUploading(true);
      try {
        const { error } = await browserClient()
          .storage.from("vehicle-images")
          .remove([photo.storage_path]);
        if (error) {
          setNotice({
            ok: false,
            message: "Não foi possível remover a foto. Tente novamente.",
          });
          return;
        }
      } finally {
        setUploading(false);
      }
    }
    setPhotos((p) => p.filter((_, i) => i !== index));
  }
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fields = Object.fromEntries(fd.entries());
    if (!folder.current) folder.current = crypto.randomUUID();
    const slug =
      String(fields.slug || "").trim() ||
      `${slugify(`${fields.brand} ${fields.model} ${fields.version} ${fields.year_model}`)}-${folder.current.slice(0, 8)}`;
    setNotice(null);
    start(async () => {
      try {
        const result = await saveVehicle(
          {
            ...fields,
            id: folder.current,
            slug,
            featured: fd.get("featured") === "on",
          },
          photos,
          selected,
        );
        setNotice(result);
        if (result.ok) {
          const removed = original.current.filter(
            (p) => !photos.some((x) => x.storage_path === p.storage_path),
          );
          let cleanupFailed = false;
          if (removed.length) {
            const { error } = await browserClient()
              .storage.from("vehicle-images")
              .remove(removed.map((p) => p.storage_path));
            cleanupFailed = Boolean(error);
          }
          original.current = photos;
          if (cleanupFailed) {
            setNotice({
              ok: true,
              message:
                "Veículo salvo. Algumas fotos antigas não puderam ser removidas do armazenamento; peça ao responsável uma limpeza posterior.",
            });
          } else {
            router.push("/gestao-nv-8f4c2a/estoque");
            router.refresh();
          }
        }
      } catch {
        setNotice({
          ok: false,
          message:
            "Não foi possível salvar. Verifique sua sessão e tente novamente. As informações foram mantidas.",
        });
      }
    });
  }
  return (
    <form ref={formRef} onSubmit={submit}>
      <Link href="/gestao-nv-8f4c2a/estoque" className="text-link">
        <ArrowLeft size={15} />
        Voltar ao estoque
      </Link>
      <div className="admin-heading" style={{ marginTop: 25 }}>
        <div>
          <h1>{vehicle ? "Editar veículo." : "Um novo carro na loja."}</h1>
          <p>
            Preencha os dados, escolha as fotos e publique quando estiver
            pronto.
          </p>
        </div>
      </div>
      <div className="editor-grid">
        <div>
          <section className="editor-section">
            <div className="editor-section-title">
              <span>01</span>
              <div>
                <h2>Informações principais</h2>
                <p>Os dados que ajudam o cliente a encontrar o carro.</p>
              </div>
            </div>
            <div className="form-grid">
              {field("brand", "Marca", "text", true)}
              {field("model", "Modelo", "text", true)}
              {field("version", "Versão")}
              {field("price", "Preço (R$)", "number", true)}
              {field("year_manufacture", "Ano de fabricação", "number", true)}
              {field("year_model", "Ano do modelo", "number", true)}
              {field("mileage", "Quilometragem", "number", true)}
            </div>
          </section>
          <section className="editor-section">
            <div className="editor-section-title">
              <span>02</span>
              <div>
                <h2>Características</h2>
                <p>Detalhes claros fazem a diferença.</p>
              </div>
            </div>
            <div className="form-grid">
              {select("fuel", "Combustível", [
                "Flex",
                "Gasolina",
                "Diesel",
                "Híbrido",
                "Elétrico",
                "Etanol",
              ])}
              {select("transmission", "Câmbio", [
                "Automático",
                "Manual",
                "CVT",
                "Automatizado",
              ])}
              {field("color", "Cor")}
              {select("body_type", "Carroceria", [
                "Hatch",
                "Sedan",
                "SUV",
                "Picape",
                "Esportivo",
                "Utilitário",
                "Perua",
              ])}
              {field("engine", "Motor")}
              {select("steering", "Direção", [
                "Elétrica",
                "Hidráulica",
                "Eletro-hidráulica",
                "Mecânica",
              ])}
              <label className="field">
                Final da placa
                <input
                  name="plate_final"
                  inputMode="numeric"
                  pattern="[0-9]?"
                  maxLength={1}
                  value={plateFinal}
                  onChange={(event) =>
                    setPlateFinal(
                      event.target.value.replace(/\D/g, "").slice(0, 1),
                    )
                  }
                  aria-describedby="plate-final-help"
                />
                <small id="plate-final-help">
                  Informe apenas o último dígito (0 a 9). Ele aparece na placa
                  ilustrada do anúncio.
                </small>
                <VehiclePlate final={plateFinal} />
              </label>
              <label className="field full-width">
                Sobre o veículo
                <textarea
                  name="description"
                  maxLength={10000}
                  defaultValue={vehicle?.description}
                  placeholder="Conservação, revisões, detalhes e outras informações relevantes."
                />
              </label>
            </div>
          </section>
          <section className="editor-section">
            <div className="editor-section-title">
              <span>03</span>
              <div>
                <h2>Opcionais</h2>
                <p>Marque os itens presentes neste veículo.</p>
              </div>
            </div>
            <div className="feature-checkboxes">
              {features.map((f) => (
                <label key={f.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(f.id)}
                    onChange={(e) =>
                      setSelected((s) =>
                        e.target.checked
                          ? [...s, f.id]
                          : s.filter((x) => x !== f.id),
                      )
                    }
                  />
                  {f.name}
                </label>
              ))}
            </div>
          </section>
          <section className="editor-section">
            <div className="editor-section-title">
              <span>04</span>
              <div>
                <h2>Fotos do veículo</h2>
                <p>
                  A primeira foto será a capa. Até 30 fotos JPG, PNG ou WebP, de
                  até 10 MB cada. Orientação e tamanho ajustados
                  automaticamente, sem recortar o veículo.
                </p>
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Selecionar fotos do veículo"
              disabled={uploading || pending}
              onChange={(e) => void upload(e.target.files)}
            />
            <button
              type="button"
              className={`upload-area ${dragging ? "dragging" : ""}`}
              disabled={uploading || pending}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void upload(e.dataTransfer.files);
              }}
            >
              <Upload size={28} />
              <strong>
                {uploading
                  ? uploadProgress || "Preparando fotos…"
                  : "Selecione ou arraste suas fotos"}
              </strong>
              <span>JPG, PNG ou WebP · Funciona também no celular</span>
              <span className="button button-outline">
                <Plus size={16} />
                Adicionar fotos
              </span>
            </button>
            <div className="photo-editor-grid">
              {photos.map((p, i) => (
                <div className="photo-editor-item" key={p.storage_path}>
                  <div className="photo-editor-preview">
                    {p.url && (
                      <Image
                        src={p.url}
                        alt={`Foto ${i + 1} do veículo`}
                        fill
                        sizes="200px"
                      />
                    )}
                    {i === 0 && <span>Capa</span>}
                  </div>
                  <div className="photo-editor-controls">
                    <button
                      type="button"
                      className="icon-button"
                      disabled={i === 0 || uploading || pending}
                      onClick={() => move(i, i - 1)}
                      aria-label={`Mover foto ${i + 1} para a esquerda`}
                    >
                      <ArrowLeft size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      disabled={i === photos.length - 1 || uploading || pending}
                      onClick={() => move(i, i + 1)}
                      aria-label={`Mover foto ${i + 1} para a direita`}
                    >
                      <ArrowRight size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      disabled={i === 0 || uploading || pending}
                      onClick={() => move(i, 0)}
                      aria-label={`Usar foto ${i + 1} como capa`}
                    >
                      <Star size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger-text"
                      disabled={uploading || pending}
                      onClick={() => void remove(i)}
                      aria-label={`Remover foto ${i + 1}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="editor-publish">
          <section className="editor-section">
            <h2>Publicação</h2>
            <p>Você decide quando o carro aparece no site.</p>
            <label className="field">
              Status
              <select name="status" defaultValue={vehicle?.status || "draft"}>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="consent">
              <input
                name="featured"
                type="checkbox"
                defaultChecked={vehicle?.featured}
              />
              <span>Destacar este veículo na Home</span>
            </label>
            <label className="field">
              Identificador na URL
              <input
                name="slug"
                defaultValue={vehicle?.slug}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={200}
                placeholder="Gerado automaticamente"
              />
              <small>Letras minúsculas, números e hífens.</small>
            </label>
            <p className="publish-hint">
              Para publicar, selecione “Disponível”. Rascunhos, vendidos e
              ocultos não aparecem no site.
            </p>
            {notice && <FormNotice {...notice} />}
            <button
              className="button button-green"
              disabled={pending || uploading}
              type="submit"
            >
              <Save size={17} />
              {pending ? "Salvando…" : "Salvar veículo"}
            </button>
            <button
              className="button button-dark"
              disabled={pending || uploading}
              type="button"
              onClick={() => {
                const select = formRef.current?.elements.namedItem(
                  "status",
                ) as HTMLSelectElement;
                select.value = "available";
                formRef.current?.requestSubmit();
              }}
            >
              Publicar veículo
            </button>
          </section>
        </aside>
      </div>
    </form>
  );
}

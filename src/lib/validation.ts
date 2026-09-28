import { z } from "zod";
export const vehicleSchema = z
  .object({
    id: z.uuid().optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .max(200),
    brand: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(120),
    version: z.string().max(180),
    year_manufacture: z.coerce.number().int().min(1900).max(2100),
    year_model: z.coerce.number().int().min(1900).max(2100),
    price: z.coerce.number().positive().max(9999999999),
    mileage: z.coerce.number().int().min(0).max(9999999),
    fuel: z.string().max(60),
    transmission: z.string().max(60),
    color: z.string().max(60),
    body_type: z.string().max(60),
    engine: z.string().max(60),
    steering: z.string().max(60),
    plate_final: z.string().regex(/^[0-9]?$/),
    description: z.string().max(10000),
    status: z.enum(["draft", "available", "reserved", "sold", "hidden"]),
    featured: z.boolean(),
  })
  .refine(
    (v) =>
      v.year_model >= v.year_manufacture &&
      v.year_model <= v.year_manufacture + 2,
    {
      message: "Confira os anos de fabricação e modelo.",
      path: ["year_model"],
    },
  );
export const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{10,13}$/)),
  email: z.email().max(254),
  type: z.enum(["vehicle_interest", "financing", "sell_vehicle", "contact"]),
  vehicle_id: z.uuid().nullable(),
  message: z.string().max(5000),
  details: z
    .record(z.string().max(50), z.string().max(1500))
    .refine(
      (value) => JSON.stringify(value).length <= 7000,
      "Reduza o texto das informações adicionais.",
    ),
  consent: z.literal(true),
  website: z.string().max(0),
});

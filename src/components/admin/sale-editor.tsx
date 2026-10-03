"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordVehicleSale } from "@/app/actions";
import { FormNotice } from "@/components/ui";
import type { ActionResult } from "@/lib/types";

export function SaleEditor({
  id,
  actualPrice,
  sold,
}: {
  id: string;
  actualPrice: number | null;
  sold: boolean;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const router = useRouter();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        setResult(null);
        start(async () => {
          try {
            const response = await recordVehicleSale({
              vehicle_id: id,
              actual_price: values.get("actual_price"),
            });
            setResult(response);
            if (response.ok) router.refresh();
          } catch {
            setResult({
              ok: false,
              message: "Não foi possível salvar. Confira sua conexão e sessão.",
            });
          }
        });
      }}
    >
      <fieldset
        disabled={pending}
        style={{ border: 0, padding: 0, minWidth: 0 }}
      >
        <label className="field">
          Valor efetivo da venda (R$)
          <input
            name="actual_price"
            type="number"
            inputMode="decimal"
            required
            min="0.01"
            max="9999999999.99"
            step="0.01"
            defaultValue={actualPrice ?? ""}
            placeholder="Informe o valor negociado"
          />
        </label>
        {!sold && (
          <label className="consent">
            <input type="checkbox" required />
            Confirmo a venda e a retirada deste veículo do estoque público.
          </label>
        )}
        <button
          className="button button-green"
          style={{ marginTop: 12 }}
          disabled={pending}
        >
          {pending
            ? "Salvando…"
            : sold
              ? "Salvar valor da venda"
              : "Registrar venda"}
        </button>
      </fieldset>
      {result && <FormNotice {...result} />}
    </form>
  );
}

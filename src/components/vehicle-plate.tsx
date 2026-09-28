export function VehiclePlate({ final }: { final: string }) {
  const digit = /^[0-9]$/.test(final) ? final : "";
  return (
    <svg
      width="164"
      height="62"
      viewBox="0 0 164 62"
      role="img"
      aria-label={
        digit
          ? `Placa com final ${digit}; demais caracteres ocultos`
          : "Placa: final não informado"
      }
      style={{ display: "block", margin: "0 auto", maxWidth: "100%" }}
    >
      <rect
        x="1.5"
        y="1.5"
        width="161"
        height="59"
        rx="4"
        fill="white"
        stroke="#111"
        strokeWidth="3"
      />
      <path fill="#003399" d="M4 4h156v11H4z" />
      <text
        x="82"
        y="11.5"
        textAnchor="middle"
        fill="white"
        fontFamily="Arial, sans-serif"
        fontSize="5"
        letterSpacing="1"
      >
        BRASIL
      </text>
      <path d="m9 8 2-2 2 2-2 2Z" fill="#c4d5ff" />
      <text
        x="7"
        y="13"
        fill="white"
        fontFamily="Arial, sans-serif"
        fontSize="2"
      >
        MERCOSUL
      </text>
      <path fill="#009b3a" d="M146 6h11v7h-11z" />
      <path fill="#ffdf00" d="m151.5 6.5 5 3-5 3-5-3Z" />
      <circle cx="151.5" cy="9.5" r="2" fill="#002776" />
      <path d="m150 9 3 1" stroke="white" strokeWidth=".5" />
      <g
        fontFamily="Arial, sans-serif"
        fontSize="28"
        fontWeight="700"
        textAnchor="end"
      >
        <text x="111" y="47" fill="#f1f1f1">
          X
        </text>
        <text x="130" y="47" fill="#d5d5d5">
          X
        </text>
        <text x="151" y="47" fill="#777">
          {digit || "—"}
        </text>
      </g>
    </svg>
  );
}

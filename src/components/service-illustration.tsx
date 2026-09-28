export function ServiceIllustration({
  finance = false,
}: {
  finance?: boolean;
}) {
  return (
    <svg
      className="service-illustration"
      viewBox="0 0 400 250"
      role="img"
      aria-label={
        finance
          ? "Ilustração de planejamento financeiro para comprar um carro"
          : "Ilustração de avaliação de veículo"
      }
    >
      <path d="M20 221H380" stroke="#d5d5d5" strokeWidth="2" />
      <path
        d="M54 203V83a57 57 0 0 1 114 0v120m85 0V56h92v147"
        fill="#f0f0f3"
      />
      {finance ? (
        <>
          <rect
            x="191"
            y="42"
            width="117"
            height="178"
            rx="16"
            fill="#323232"
          />
          <rect x="208" y="62" width="83" height="47" rx="4" fill="#ddd" />
          {[0, 1, 2].flatMap((y) =>
            [0, 1, 2].map((x) => (
              <rect
                key={`${x}-${y}`}
                x={207 + x * 29}
                y={122 + y * 27}
                width="23"
                height="17"
                rx="4"
                fill={x === 2 ? "#ff0001" : "#ececec"}
              />
            )),
          )}
          <rect x="93" y="88" width="82" height="132" rx="7" fill="#ff0001" />
          <path
            d="M113 113h43m-43 19h43m-43 19h43m-43 19h43"
            stroke="white"
            strokeWidth="6"
          />
          <text
            x="113"
            y="66"
            fontFamily="Arial"
            fontSize="59"
            fontWeight="700"
            fill="#444"
          >
            $
          </text>
          <path d="M54 220l13-77 26 1 9 76" fill="#3b3b3b" />
          <circle cx="81" cy="117" r="17" fill="#f3bb97" />
          <path d="M65 136l28 2 18 40-51-4z" fill="#ff0001" />
          <path d="M99 145l38 13" stroke="#f3bb97" strokeWidth="11" />
        </>
      ) : (
        <>
          <rect x="76" y="16" width="86" height="146" rx="13" fill="#343b3e" />
          <rect x="84" y="27" width="70" height="117" rx="5" fill="white" />
          <path d="M119 49c-22 0-27 28 0 52 27-24 22-52 0-52" fill="#ff0001" />
          <circle cx="119" cy="67" r="7" fill="white" />
          <path d="M58 151l31-37h127l52 34 54 9 19 40H50z" fill="#ff0001" />
          <path d="M102 121h49v34H77zm61 0h49l44 34h-93z" fill="#25343b" />
          <path d="M54 174h281" stroke="#bf0001" strokeWidth="4" />
          <circle cx="110" cy="194" r="31" fill="#25343b" />
          <circle cx="110" cy="194" r="18" fill="#ddd" />
          <circle cx="284" cy="194" r="31" fill="#25343b" />
          <circle cx="284" cy="194" r="18" fill="#ddd" />
          <path d="M311 155h21v11h-21" fill="white" />
          <path d="M230 102l18-45 28 12-11 61" fill="#303a40" />
          <circle cx="266" cy="42" r="17" fill="#f3bb97" />
          <path d="M249 59l22 10 10 33-39 4z" fill="#ff0001" />
          <path
            d="M270 80l-30 35-24-5"
            fill="none"
            stroke="#f3bb97"
            strokeWidth="10"
          />
        </>
      )}
    </svg>
  );
}

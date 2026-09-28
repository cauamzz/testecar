"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Settings } from "@/lib/types";
export function ReferenceHero({ settings }: { settings: Settings }) {
  const [slide, setSlide] = useState(0);
  return (
    <section
      className="reference-hero"
      aria-roledescription="carrossel"
      aria-label="Destaques da NovaDrive"
    >
      <Image
        src={settings.hero_image || "/images/hero.webp"}
        alt="Automóvel em destaque — fotografia ilustrativa"
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
        className="reference-hero-photo"
      />
      <div className="reference-hero-overlay" />
      <div className="container reference-hero-content">
        <div
          className="reference-hero-message"
          data-animated={slide !== 0}
          key={slide}
        >
          <h1 className="slanted-title">
            <span>
              {slide === 0 ? (
                settings.hero_title &&
                settings.hero_title !== "Seu próximo carro começa aqui." ? (
                  settings.hero_title
                ) : (
                  <>
                    Seu próximo
                    <br />
                    carro está aqui
                  </>
                )
              ) : (
                <>
                  Quer vender
                  <br />
                  seu carro?
                </>
              )}
            </span>
          </h1>
          <h2 className="slanted-subtitle">
            <span>
              {slide === 0
                ? "Conheça a NovaDrive!"
                : "Vamos avaliar seu veículo!"}
            </span>
          </h2>
          <p>
            {slide === 0
              ? settings.hero_subtitle
              : "Venda ou use seu carro na troca. Conte sobre seu veículo e converse com nossa equipe sobre as possibilidades de negócio."}
          </p>
          <Link
            prefetch={false}
            className="button reference-hero-cta"
            href={slide === 0 ? "/estoque" : "/#vender-meu-veiculo"}
          >
            {slide === 0 ? "Veja o nosso estoque" : "Vender meu veículo"}
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
      <div
        className="hero-pagination"
        role="group"
        aria-label="Escolher destaque"
      >
        {[0, 1].map((i) => (
          <button
            key={i}
            aria-label={`Mostrar destaque ${i + 1}`}
            aria-pressed={slide === i}
            onClick={() => setSlide(i)}
          >
            <span />
          </button>
        ))}
      </div>
    </section>
  );
}

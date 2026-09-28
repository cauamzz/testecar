"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { Expand, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { VehicleImage } from "@/lib/types";
export function VehicleGallery({
  images,
  title,
}: {
  images: VehicleImage[];
  title: string;
}) {
  const [current, setCurrent] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const touch = useRef(0);
  const photos = images.filter((i) => i.url);
  const next = (offset: number) =>
    setCurrent((i) => (i + offset + photos.length) % photos.length);
  if (!photos.length)
    return (
      <div className="gallery-main photo-placeholder">
        Fotos temporariamente indisponíveis
      </div>
    );
  return (
    <div
      onTouchStart={(e) => {
        touch.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const distance = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(distance) > 55) next(distance < 0 ? 1 : -1);
      }}
    >
      <button
        className="gallery-main"
        onClick={() => dialog.current?.showModal()}
        aria-label="Ampliar fotos do veículo"
      >
        <Image
          src={photos[current].url!}
          alt={`${title} — foto ${current + 1}`}
          fill
          loading="eager"
          fetchPriority="high"
          sizes="(max-width:600px) 100vw,60vw"
        />
        <span className="gallery-expand">
          <Expand size={16} />
          {current + 1} / {photos.length}
        </span>
      </button>
      <div className="gallery-thumbs" aria-label="Fotos do veículo">
        {photos.map((p, i) => (
          <button
            key={p.storage_path}
            onClick={() => setCurrent(i)}
            aria-label={`Mostrar foto ${i + 1}`}
            aria-pressed={current === i}
          >
            <Image src={p.url!} alt="" fill sizes="100px" />
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="lightbox"
        aria-label={`Galeria de ${title}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") next(1);
          if (e.key === "ArrowLeft") next(-1);
        }}
      >
        <button
          autoFocus
          className="icon-button lightbox-close"
          onClick={() => dialog.current?.close()}
          aria-label="Fechar galeria"
        >
          <X />
        </button>
        <div className="lightbox-image">
          <Image
            src={photos[current].url!}
            alt={`${title} — foto ${current + 1}`}
            fill
            sizes="100vw"
          />
        </div>
        <div className="lightbox-toolbar">
          <button
            className="icon-button"
            onClick={() => next(-1)}
            aria-label="Foto anterior"
          >
            <ChevronLeft />
          </button>
          <span aria-live="polite">
            {current + 1} / {photos.length}
          </span>
          <button
            className="icon-button"
            onClick={() => next(1)}
            aria-label="Próxima foto"
          >
            <ChevronRight />
          </button>
        </div>
      </dialog>
    </div>
  );
}

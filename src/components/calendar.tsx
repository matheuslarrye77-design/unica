"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteEvent } from "@/server/actions";
import type { CompanyEvent } from "@/lib/types";
import { Button, toast } from "./ui";
import { EventForm } from "./forms";

export function NewEventButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Novo evento</Button>
      {open ? <EventForm onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function EventActions({ event }: { event: CompanyEvent }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  return (
    <div className="flex gap-2">
      <button type="button" className="text-sm font-medium text-unica" onClick={() => setEditing(true)}>
        Editar
      </button>
      <button
        type="button"
        className="text-sm text-mute hover:text-danger"
        onClick={async () => {
          if (!window.confirm("Excluir este evento?")) return;
          const result = await deleteEvent(event.id);
          if (!result.ok) toast(result.error, "error");
          else {
            toast(result.message || "Evento excluído.");
            router.refresh();
          }
        }}
      >
        Excluir
      </button>
      {editing ? <EventForm event={event} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}

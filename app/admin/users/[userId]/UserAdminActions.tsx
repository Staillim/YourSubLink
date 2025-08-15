"use client";

import { useState } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function UserAdminActions({ userId, accountStatus }: { userId: string; accountStatus: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(accountStatus);

  const handleToggle = async () => {
    setLoading(true);
    const newStatus = status === "active" ? "suspended" : "active";
    try {
      await updateDoc(doc(db, "users", userId), { accountStatus: newStatus });
      setStatus(newStatus);
      toast({
        title: `Usuario ${newStatus === "active" ? "reactivado" : "suspendido"}`,
        description: `El usuario ha sido ${newStatus === "active" ? "reactivado" : "suspendido"}.`,
      });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className={`mt-2 px-4 py-2 rounded text-white ${status === "active" ? "bg-red-600" : "bg-green-600"}`}
      onClick={handleToggle}
      disabled={loading}
    >
      {loading
        ? "Procesando..."
        : status === "active"
        ? "Suspender usuario"
        : "Reactivar usuario"}
    </Button>
  );
}

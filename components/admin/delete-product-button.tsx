"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteProductAction } from "@/app/(admin)/admin/actions";

export function DeleteProductButton({
  id,
  name,
  batchCount,
}: {
  id: string;
  name: string;
  batchCount: number;
}) {
  // A product with stock cannot be deleted; the server refuses it too, but
  // saying so here is kinder than a failed submit.
  const blocked = batchCount > 0;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="size-3.5" aria-hidden />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {blocked ? "This product still has stock" : `Delete ${name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {blocked
              ? `${name} has ${batchCount} inventory batch${batchCount === 1 ? "" : "es"}. Remove its stock before deleting it, so no batch is left pointing at a product that no longer exists.`
              : "This removes the product, its listing, variant and photograph. Orders that already reference it keep their own immutable snapshots."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {!blocked && (
            <form action={deleteProductAction}>
              <input type="hidden" name="id" value={id} />
              <AlertDialogAction type="submit">Delete</AlertDialogAction>
            </form>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

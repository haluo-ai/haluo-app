import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useClientConfig } from "@/lib/clientConfig";

import type { ZBookmark } from "@hoarder/shared/types/bookmarks";
import { useUpdateBookmark } from "@hoarder/shared-react/hooks/bookmarks";

export function NoteEditor({ bookmark }: { bookmark: ZBookmark }) {
  const demoMode = !!useClientConfig().demoMode;

  const updateBookmarkMutator = useUpdateBookmark({
    onSuccess: () => {
      toast({
        description: "The bookmark has been updated!",
      });
    },
    onError: () => {
      toast({
        description: "Something went wrong while saving the note",
        variant: "destructive",
      });
    },
  });

  return (
    <Textarea
      className="h-44 w-full overflow-auto rounded bg-background p-2 text-sm text-gray-400 dark:text-gray-300"
      defaultValue={bookmark.note ?? ""}
      disabled={demoMode}
      placeholder="Write some notes ..."
      onBlur={(e) => {
        if (e.currentTarget.value == bookmark.note) {
          return;
        }
        updateBookmarkMutator.mutate({
          bookmarkId: bookmark.id,
          note: e.currentTarget.value,
        });
      }}
    />
  );
}

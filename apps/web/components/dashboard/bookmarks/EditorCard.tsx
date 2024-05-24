import type { SubmitErrorHandler, SubmitHandler } from "react-hook-form";
import React, { useEffect, useImperativeHandle, useRef } from "react";
import Link from "next/link";
import { ActionButton } from "@/components/ui/action-button";
import { Form, FormControl, FormItem } from "@/components/ui/form";
import InfoTooltip from "@/components/ui/info-tooltip";
import MultipleChoiceDialog from "@/components/ui/multiple-choice-dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useClientConfig } from "@/lib/clientConfig";
import { useBookmarkLayoutSwitch } from "@/lib/userLocalSettings/bookmarksLayout";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useCreateBookmarkWithPostHook } from "@hoarder/shared-react/hooks/bookmarks";

function useFocusOnKeyPress(inputRef: React.RefObject<HTMLTextAreaElement>) {
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (!inputRef.current) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyE") {
        inputRef.current.focus();
      }
    }
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [inputRef]);
}

interface MultiUrlImportState {
  urls: URL[];
  text: string;
}

export default function EditorCard({ className }: { className?: string }) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [multiUrlImportState, setMultiUrlImportState] =
    React.useState<MultiUrlImportState | null>(null);

  const demoMode = !!useClientConfig().demoMode;
  const formSchema = z.object({
    text: z.string(),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      text: "",
    },
  });
  const { ref, ...textFieldProps } = form.register("text");
  useImperativeHandle(ref, () => inputRef.current);
  useFocusOnKeyPress(inputRef);

  const { mutate, isPending } = useCreateBookmarkWithPostHook({
    onSuccess: (resp) => {
      if (resp.alreadyExists) {
        toast({
          description: (
            <div className="flex items-center gap-1">
              Bookmark already exists.
              <Link
                className="flex underline-offset-4 hover:underline"
                href={`/dashboard/preview/${resp.id}`}
              >
                Open <ExternalLink className="ml-1 size-4" />
              </Link>
            </div>
          ),
          variant: "default",
        });
      }
      form.reset();
    },
    onError: () => {
      toast({ description: "Something went wrong", variant: "destructive" });
    },
  });

  function tryToImportUrls(text: string): void {
    const lines = text.split("\n");
    const urls: URL[] = [];
    for (const line of lines) {
      // parsing can also throw an exception, but will be caught outside
      const url = new URL(line);
      if (url.protocol != "http:" && url.protocol != "https:") {
        throw new Error("Invalid URL");
      }
      urls.push(url);
    }

    if (urls.length === 1) {
      // Only 1 url in the textfield --> simply import it
      mutate({ type: "link", url: text });
      return;
    }
    // multiple urls found --> ask the user if it should be imported as multiple URLs or as a text bookmark
    setMultiUrlImportState({ urls, text });
  }

  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = (data) => {
    const text = data.text.trim();
    try {
      tryToImportUrls(text);
    } catch (e) {
      // Not a URL
      mutate({ type: "text", text });
    }
  };
  const onError: SubmitErrorHandler<z.infer<typeof formSchema>> = (errors) => {
    toast({
      description: Object.values(errors)
        .map((v) => v.message)
        .join("\n"),
      variant: "destructive",
    });
  };
  const cardHeight = useBookmarkLayoutSwitch({
    grid: "h-96",
    masonry: "h-96",
    list: undefined,
  });

  return (
    <Form {...form}>
      <form
        className={cn(
          className,
          "flex flex-col gap-2 rounded-xl bg-card p-4",
          cardHeight,
        )}
        onSubmit={form.handleSubmit(onSubmit, onError)}
      >
        <div className="flex justify-between">
          <p className="text-sm">NEW ITEM</p>
          <InfoTooltip size={15}>
            <p className="text-center">
              You can quickly focus on this field by pressing ⌘ + E
            </p>
          </InfoTooltip>
        </div>
        <Separator />
        <FormItem className="flex-1">
          <FormControl>
            <Textarea
              ref={inputRef}
              disabled={isPending}
              className="h-full w-full resize-none border-none text-lg focus-visible:ring-0"
              placeholder={
                "Paste a link, write a note or drag and drop an image in here ..."
              }
              onKeyDown={(e) => {
                if (demoMode) {
                  return;
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  form.handleSubmit(onSubmit, onError)();
                }
              }}
              {...textFieldProps}
            />
          </FormControl>
        </FormItem>
        <ActionButton loading={isPending} type="submit" variant="default">
          {form.formState.dirtyFields.text
            ? demoMode
              ? "Submissions are disabled"
              : "Press ⌘ + Enter to Save"
            : "Save"}
        </ActionButton>

        {multiUrlImportState && (
          <MultipleChoiceDialog
            open={true}
            title={`Import URLs as separate Bookmarks?`}
            description={`The input contains multiple URLs on separate lines. Do you want to import them as separate bookmarks?`}
            onOpenChange={(open) => {
              if (!open) {
                setMultiUrlImportState(null);
              }
            }}
            actionButtons={[
              () => (
                <ActionButton
                  type="button"
                  variant="secondary"
                  loading={isPending}
                  onClick={() => {
                    mutate({ type: "text", text: multiUrlImportState.text });
                    setMultiUrlImportState(null);
                  }}
                >
                  Import as Text Bookmark
                </ActionButton>
              ),
              () => (
                <ActionButton
                  type="button"
                  variant="destructive"
                  loading={isPending}
                  onClick={() => {
                    multiUrlImportState.urls.forEach((url) =>
                      mutate({ type: "link", url: url.toString() }),
                    );
                    setMultiUrlImportState(null);
                  }}
                >
                  Import as separate Bookmarks
                </ActionButton>
              ),
            ]}
          ></MultipleChoiceDialog>
        )}
      </form>
    </Form>
  );
}

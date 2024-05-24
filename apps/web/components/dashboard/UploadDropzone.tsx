"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import DropZone from "react-dropzone";

import { useCreateBookmarkWithPostHook } from "@hoarder/shared-react/hooks/bookmarks";
import {
  zUploadErrorSchema,
  zUploadResponseSchema,
} from "@hoarder/shared/types/uploads";

import LoadingSpinner from "../ui/spinner";
import { toast } from "../ui/use-toast";

function useUploadAsset({ onComplete }: { onComplete: () => void }) {
  const { mutateAsync: createBookmark } = useCreateBookmarkWithPostHook({
    onSuccess: () => {
      toast({ description: "Bookmark uploaded" });
      onComplete();
    },
    onError: () => {
      toast({ description: "Something went wrong", variant: "destructive" });
    },
  });

  const { mutateAsync: runUpload } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const resp = await fetch("/api/assets", {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) {
        throw new Error(await resp.text());
      }
      return zUploadResponseSchema.parse(await resp.json());
    },
    onSuccess: async (resp) => {
      const assetType =
        resp.contentType === "application/pdf" ? "pdf" : "image";
      return createBookmark({ ...resp, type: "asset", assetType });
    },
    onError: (error, req) => {
      const err = zUploadErrorSchema.parse(JSON.parse(error.message));
      toast({
        description: `${req.name}: ${err.error}`,
        variant: "destructive",
      });
    },
  });

  return runUpload;
}

function useUploadAssets({
  onFileUpload,
  onFileError,
  onAllUploaded,
}: {
  onFileUpload: () => void;
  onFileError: (name: string, e: Error) => void;
  onAllUploaded: () => void;
}) {
  const runUpload = useUploadAsset({ onComplete: onFileUpload });

  return async (files: File[]) => {
    if (files.length == 0) {
      return;
    }
    for (const file of files) {
      try {
        await runUpload(file);
      } catch (e) {
        if (e instanceof TRPCClientError || e instanceof Error) {
          onFileError(file.name, e);
        }
      }
    }
    onAllUploaded();
  };
}

export default function UploadDropzone({
  children,
}: {
  children: React.ReactNode;
}) {
  const [numUploading, setNumUploading] = useState(0);
  const [numUploaded, setNumUploaded] = useState(0);
  const uploadAssets = useUploadAssets({
    onFileUpload: () => {
      setNumUploaded((c) => c + 1);
    },
    onFileError: () => {
      setNumUploaded((c) => c + 1);
    },
    onAllUploaded: () => {
      setNumUploading(0);
      setNumUploaded(0);
      return;
    },
  });

  const [isDragging, setDragging] = useState(false);
  const onDrop = (acceptedFiles: File[]) => {
    uploadAssets(acceptedFiles);
    setNumUploading(acceptedFiles.length);
    setDragging(false);
  };

  return (
    <DropZone
      noClick
      onDrop={onDrop}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
    >
      {({ getRootProps, getInputProps }) => (
        <div {...getRootProps()}>
          <input {...getInputProps()} hidden />
          <div
            className={cn(
              "fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-gray-200 opacity-90",
              isDragging || numUploading > 0 ? undefined : "hidden",
            )}
          >
            {numUploading > 0 ? (
              <div className="flex items-center justify-center gap-2">
                <p className="text-2xl font-bold text-gray-700">
                  Uploading {numUploaded} / {numUploading}
                </p>
                <LoadingSpinner />
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-700">
                Drop Your Image
              </p>
            )}
          </div>
          {children}
        </div>
      )}
    </DropZone>
  );
}

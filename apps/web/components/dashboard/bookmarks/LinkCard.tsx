"use client";

import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/trpc";

import type { ZBookmarkTypeLink } from "@hoarder/shared/types/bookmarks";
import {
  getBookmarkLinkImageUrl,
  isBookmarkStillCrawling,
  isBookmarkStillLoading,
} from "@hoarder/shared-react/utils/bookmarkUtils";

import { BookmarkLayoutAdaptingCard } from "./BookmarkLayoutAdaptingCard";

function LinkTitle({ bookmark }: { bookmark: ZBookmarkTypeLink }) {
  const link = bookmark.content;
  const parsedUrl = new URL(link.url);
  return (
    <Link href={link.url} target="_blank">
      {bookmark.title ?? link?.title ?? parsedUrl.host}
    </Link>
  );
}

function LinkImage({
  bookmark,
  className,
}: {
  bookmark: ZBookmarkTypeLink;
  className?: string;
}) {
  const link = bookmark.content;

  const imgComponent = (url: string, unoptimized: boolean) => (
    <Image
      unoptimized={unoptimized}
      className={className}
      alt="card banner"
      fill={true}
      src={url}
    />
  );

  const imageDetails = getBookmarkLinkImageUrl(link);

  let img: React.ReactNode = null;
  if (isBookmarkStillCrawling(bookmark)) {
    img = imgComponent("/blur.avif", false);
  } else if (imageDetails) {
    img = imgComponent(imageDetails.url, !imageDetails.localAsset);
  } else {
    // No image found
    // A dummy white pixel for when there's no image.
    img = imgComponent(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdj+P///38ACfsD/QVDRcoAAAAASUVORK5CYII=",
      true,
    );
  }

  return (
    <Link href={link.url} target="_blank" className={className}>
      <div className="relative size-full flex-1">{img}</div>
    </Link>
  );
}

function LinkUrl({ bookmark }: { bookmark: ZBookmarkTypeLink }) {
  const link = bookmark.content;
  const parsedUrl = new URL(link.url);
  return (
    <Link
      className="line-clamp-1 hover:text-foreground"
      href={link.url}
      target="_blank"
    >
      {parsedUrl.host}
    </Link>
  );
}

export default function LinkCard({
  bookmark: initialData,
  className,
}: {
  bookmark: ZBookmarkTypeLink;
  className?: string;
}) {
  const { data: bookmark } = api.bookmarks.getBookmark.useQuery(
    {
      bookmarkId: initialData.id,
    },
    {
      initialData,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!data) {
          return false;
        }
        // If the link is not crawled or not tagged
        if (isBookmarkStillLoading(data)) {
          return 1000;
        }
        return false;
      },
    },
  );

  if (bookmark.content.type !== "link") {
    throw new Error("Invalid bookmark type");
  }

  const bookmarkLink = { ...bookmark, content: bookmark.content };

  return (
    <BookmarkLayoutAdaptingCard
      title={<LinkTitle bookmark={bookmarkLink} />}
      footer={<LinkUrl bookmark={bookmarkLink} />}
      bookmark={bookmarkLink}
      wrapTags={false}
      image={(_layout, className) => (
        <LinkImage className={className} bookmark={bookmarkLink} />
      )}
      className={className}
    />
  );
}

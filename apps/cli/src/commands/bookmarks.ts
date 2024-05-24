import * as fs from "node:fs";
import { getAPIClient } from "@/lib/trpc";
import { Command } from "@commander-js/extra-typings";
import chalk from "chalk";

import type { ZBookmark } from "@hoarder/shared/types/bookmarks";
import { MAX_NUM_BOOKMARKS_PER_PAGE } from "@hoarder/shared/types/bookmarks";

export const bookmarkCmd = new Command()
  .name("bookmarks")
  .description("manipulating bookmarks");

function collect<T>(val: T, acc: T[]) {
  acc.push(val);
  return acc;
}

function normalizeBookmark(bookmark: ZBookmark) {
  const ret = {
    ...bookmark,
    tags: bookmark.tags.map((t) => t.name),
  };

  if (ret.content.type == "link" && ret.content.htmlContent) {
    if (ret.content.htmlContent.length > 10) {
      ret.content.htmlContent =
        ret.content.htmlContent.substring(0, 10) + "... <CROPPED>";
    }
  }
  return ret;
}

bookmarkCmd
  .command("add")
  .description("creates a new bookmark")
  .option(
    "--link <link>",
    "the link to add. Specify multiple times to add multiple links",
    collect<string>,
    [],
  )
  .option(
    "--note <note>",
    "the note text to add. Specify multiple times to add multiple notes",
    collect<string>,
    [],
  )
  .option("--stdin", "reads the data from stdin and store it as a note")
  .action(async (opts) => {
    const api = getAPIClient();

    const promises = [
      ...opts.link.map((url) =>
        api.bookmarks.createBookmark.mutate({ type: "link", url }),
      ),
      ...opts.note.map((text) =>
        api.bookmarks.createBookmark.mutate({ type: "text", text }),
      ),
    ];

    if (opts.stdin) {
      const text = fs.readFileSync(0, "utf-8");
      promises.push(
        api.bookmarks.createBookmark.mutate({ type: "text", text }),
      );
    }

    const results = await Promise.allSettled(promises);

    for (const res of results) {
      if (res.status == "fulfilled") {
        console.log(normalizeBookmark(res.value));
      } else {
        console.log(chalk.red(`Error: ${res.reason}`));
      }
    }
  });

bookmarkCmd
  .command("get")
  .description("fetch information about a bookmark")
  .argument("<id>", "The id of the bookmark to get")
  .action(async (id) => {
    const api = getAPIClient();
    const resp = await api.bookmarks.getBookmark.query({ bookmarkId: id });
    console.log(normalizeBookmark(resp));
  });

bookmarkCmd
  .command("update")
  .description("update a bookmark")
  .option("--title <title>", "if set, the bookmark's title will be updated")
  .option("--note <note>", "if set, the bookmark's note will be updated")
  .option("--archive", "if set, the bookmark will be archived")
  .option("--no-archive", "if set, the bookmark will be unarchived")
  .option("--favourite", "if set, the bookmark will be favourited")
  .option("--no-favourite", "if set, the bookmark will be unfavourited")
  .argument("<id>", "the id of the bookmark to get")
  .action(async (id, opts) => {
    const api = getAPIClient();
    const resp = await api.bookmarks.updateBookmark.mutate({
      bookmarkId: id,
      archived: opts.archive,
      favourited: opts.favourite,
      title: opts.title,
    });
    console.log(resp);
  });

bookmarkCmd
  .command("list")
  .description("list all bookmarks")
  .option(
    "--include-archived",
    "If set, archived bookmarks will be fetched as well",
    false,
  )
  .option("--list-id <id>", "if set, only items from that list will be fetched")
  .action(async (opts) => {
    const api = getAPIClient();

    const request = {
      archived: opts.includeArchived ? undefined : false,
      listId: opts.listId,
      limit: MAX_NUM_BOOKMARKS_PER_PAGE,
    };

    let resp = await api.bookmarks.getBookmarks.query(request);
    let results: ZBookmark[] = resp.bookmarks;

    while (resp.nextCursor) {
      resp = await api.bookmarks.getBookmarks.query({
        ...request,
        cursor: resp.nextCursor,
      });
      results = [...results, ...resp.bookmarks];
    }

    console.dir(results.map(normalizeBookmark), { maxArrayLength: null });
  });

bookmarkCmd
  .command("delete")
  .description("delete a bookmark")
  .argument("<id>", "the id of the bookmark to delete")
  .action(async (id) => {
    const api = getAPIClient();
    await api.bookmarks.deleteBookmark.mutate({ bookmarkId: id });
    console.log(`Bookmark ${id} got deleted`);
  });

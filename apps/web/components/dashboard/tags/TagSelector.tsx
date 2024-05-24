import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LoadingSpinner from "@/components/ui/spinner";
import { api } from "@/lib/trpc";

export function TagSelector({
  value,
  onChange,
  placeholder = "Select a tag",
}: {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { data: allTags, isPending } = api.tags.list.useQuery();

  if (isPending || !allTags) {
    return <LoadingSpinner />;
  }

  allTags.tags = allTags.tags.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Select onValueChange={onChange} value={value ?? ""}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {allTags?.tags.map((tag) => {
            return (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            );
          })}
          {allTags && allTags.tags.length == 0 && (
            <SelectItem value="notag" disabled>
              You don&apos;t currently have any tags.
            </SelectItem>
          )}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

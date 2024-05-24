import HaluoLogoIcon from "@/public/icons/haluoicon.webp";
import HaluoLogoText from "@/public/icons/texticon.png";

export default function HaluoLogo({
  height,
  gap,
}: {
  height: number;
  gap: string;
}) {
  return (
    <span style={{ gap }} className="flex items-center">
      <HaluoLogoIcon height={height} className={`fill-foreground`} />
      <HaluoLogoText
        height={(height * 2) / 3}
        className={`fill-foreground`}
      />
    </span>
  );
}

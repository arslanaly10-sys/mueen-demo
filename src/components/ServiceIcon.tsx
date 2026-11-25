import { BookOpenIcon, BriefcaseIcon, CarIcon, CarProfileIcon, HeartbeatIcon, IdentificationCardIcon, MedalIcon, type Icon } from "@phosphor-icons/react";
import type { ServiceId } from "@/lib/types";

const MAP: Record<ServiceId, Icon> = {
  driving_license: CarIcon,
  iqama_domestic: IdentificationCardIcon,
  passport: BookOpenIcon,
  vehicle_registration: CarProfileIcon,
  work_permit: BriefcaseIcon,
  health_certificate: HeartbeatIcon,
  consulting_license: MedalIcon,
};

export function ServiceIcon({ id, size = 18, className }: { id: ServiceId; size?: number; className?: string }) {
  const I = MAP[id];
  return <I size={size} className={className} aria-hidden="true" />;
}

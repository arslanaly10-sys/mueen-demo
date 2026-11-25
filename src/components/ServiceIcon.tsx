import { Award, BookOpen, Briefcase, Car, CarFront, HeartPulse, IdCard, type LucideProps } from "lucide-react";
import type { ServiceId } from "@/lib/types";

const MAP: Record<ServiceId, React.ComponentType<LucideProps>> = {
  driving_license: Car,
  iqama_domestic: IdCard,
  passport: BookOpen,
  vehicle_registration: CarFront,
  work_permit: Briefcase,
  health_certificate: HeartPulse,
  consulting_license: Award,
};

export function ServiceIcon({ id, size = 18, className }: { id: ServiceId; size?: number; className?: string }) {
  const I = MAP[id];
  return <I size={size} className={className} aria-hidden="true" />;
}

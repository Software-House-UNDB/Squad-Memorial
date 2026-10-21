import {
  Award, BookOpen, Camera, FlaskConical, GraduationCap, Landmark, Monitor, Users,
  type LucideIcon,
} from "lucide-react";
import type { Icone } from "../lib/api";

const MAPA: Record<Icone, LucideIcon> = {
  predio: Landmark,
  livro: BookOpen,
  ciencia: FlaskConical,
  tecnologia: Monitor,
  camera: Camera,
  formatura: GraduationCap,
  estrela: Award,
  pessoas: Users,
};

export function IconePeriodo({ icone, size = 28 }: { icone: Icone; size?: number }) {
  const C = MAPA[icone] ?? Landmark;
  return <C size={size} strokeWidth={1.6} aria-hidden />;
}

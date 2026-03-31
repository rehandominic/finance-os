import { ProjectorShell } from "./components/projector-shell";

export default function ProjectorLayout({ children }: { children: React.ReactNode }) {
  return <ProjectorShell>{children}</ProjectorShell>;
}

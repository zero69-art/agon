import { getTimeline } from './timeline';
import { canvasSize, type Project } from './types';
import { slugify } from './rng';

export interface ProjectExportFile {
  name: string;
  content: string;
  type: string;
}

function timecode(seconds: number, separator = ','): string {
  const ms = Math.round(Math.max(0, seconds) * 1000);
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}${separator}${millis.toString().padStart(3, '0')}`;
}

function captionText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function captions(project: Project, separator: ',' | '.') {
  return getTimeline(project)
    .filter((item) => item.kind === 'scene' && item.scene?.text.trim())
    .map((item, index) => `${index + 1}\n${timecode(item.start, separator)} --> ${timecode(item.start + item.duration, separator)}\n${captionText(item.scene?.text ?? '')}\n`)
    .join('\n');
}

function blenderScript(project: Project): string {
  const { w, h } = canvasSize(project.aspect, project.quality);
  return `# Agon Blender render bridge\n# Generated locally from ${project.title || 'Untitled story'}\n# Run: blender --background --python render.py\nimport json\nimport bpy\n\nwith open("project.json", "r", encoding="utf-8") as f:\n    data = json.load(f)\nproject = data["project"]\nscenes = project["scenes"]\nscene = bpy.context.scene\nscene.render.resolution_x = ${w}\nscene.render.resolution_y = ${h}\nscene.render.resolution_percentage = 100\nscene.render.fps = 30\n\n# This bridge creates a clean scene manifest for Blender.\n# Replace the visual block below with your preferred Blender materials,\n# imported assets, camera animation, and compositor setup.\nfor index, item in enumerate(scenes):\n    text = item["text"]\n    print(f"Scene {index + 1}: {text}")\n\nprint("Agon project loaded. Add Blender materials/camera logic in this script.")\n`;
}

function ffmpegScript(project: Project): string {
  const { w, h } = canvasSize(project.aspect, project.quality);
  const title = project.title || 'agon-output';
  return `# Agon FFmpeg render helper\n# Render numbered PNG frames into frames/ before running this script.\n$Output = "${slugify(title)}.mp4"\nffmpeg -y -framerate 30 -i frames/%06d.png -i narration.wav -i music.wav -filter_complex "[1:a][2:a]amix=inputs=2:duration=longest:dropout_transition=2[a]" -map 0:v -map "[a]" -c:v libx264 -pix_fmt yuv420p -s ${w}x${h} -c:a aac -b:a 192k $Output\nWrite-Host "Rendered $Output"\n`;
}

export function createProjectExport(project: Project): ProjectExportFile[] {
  const base = slugify(project.title);
  const json = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), project }, null, 2);
  return [
    { name: `${base}.json`, content: json, type: 'application/json' },
    { name: `${base}.srt`, content: captions(project, ','), type: 'application/x-subrip' },
    { name: `${base}.vtt`, content: `WEBVTT\n\n${captions(project, '.')}`, type: 'text/vtt' },
    { name: `${base}-blender.py`, content: blenderScript(project), type: 'text/x-python' },
    { name: `${base}-ffmpeg.ps1`, content: ffmpegScript(project), type: 'text/plain' },
  ];
}

export function downloadProjectExport(project: Project): void {
  for (const file of createProjectExport(project)) {
    const url = URL.createObjectURL(new Blob([file.content], { type: file.type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}

export async function readProjectExport(file: File): Promise<Project> {
  const parsed: unknown = JSON.parse(await file.text());
  if (!parsed || typeof parsed !== 'object' || !('project' in parsed)) throw new Error('This file is not an Agon project export.');
  const project = (parsed as { project: Project }).project;
  if (!project || typeof project.title !== 'string' || !Array.isArray(project.scenes)) throw new Error('The project export is missing required fields.');
  return project;
}
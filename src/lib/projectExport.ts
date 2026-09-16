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
  const manifest = JSON.stringify({
    title: project.title || 'Untitled',
    fps: 30,
    scenes: project.scenes.map((scene, index) => ({
      index: index + 1,
      text: scene.text,
      duration: scene.duration,
      bg: scene.bg,
      motif: scene.motif,
      palette: scene.palette,
      camera: scene.camera,
      dimension: scene.dimension,
    })),
  }, null, 2);

  return `# Agon procedural Blender film bridge\n# Generated from: ${project.title || 'Untitled story'}\n# Requires Blender 4.x. Run with:\n#   blender --background --python ${slugify(project.title || 'agon-film')}-blender.py\n#\n# This script creates editable 3D proxy scenes, actors, cameras, lights,\n# and keyframed camera/character motion from the Agon project manifest.\n# Replace proxy assets later with your production characters and rigs.\n\nimport json\nimport math\nfrom pathlib import Path\nimport bpy\nfrom mathutils import Vector\n\nWIDTH = ${w}\nHEIGHT = ${h}\nFPS = 30\nOUTPUT_DIR = Path('agon_frames')\nPROJECT = ${JSON.stringify(manifest)}\n\nCOLORS = [\n    (0.12, 0.22, 0.42, 1),\n    (0.56, 0.18, 0.12, 1),\n    (0.14, 0.42, 0.30, 1),\n    (0.52, 0.34, 0.10, 1),\n    (0.28, 0.16, 0.46, 1),\n    (0.75, 0.50, 0.16, 1),\n]\n\ndef clear():\n    bpy.ops.object.select_all(action='SELECT')\n    bpy.ops.object.delete(use_global=False)\n    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):\n        for block in list(datablocks):\n            if block.users == 0:\n                datablocks.remove(block)\n\ndef mat(name, color, metallic=0.0, roughness=0.65):\n    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)\n    m.diffuse_color = color\n    m.metallic = metallic\n    m.roughness = roughness\n    return m\n\ndef cube(name, loc, scale, material):\n    bpy.ops.mesh.primitive_cube_add(location=loc)\n    o = bpy.context.object\n    o.name = name\n    o.scale = scale\n    o.data.materials.append(material)\n    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n    return o\n\ndef sphere(name, loc, scale, material):\n    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, location=loc)\n    o = bpy.context.object\n    o.name = name\n    o.scale = scale\n    o.data.materials.append(material)\n    return o\n\ndef cylinder(name, loc, radius, depth, material):\n    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=depth, location=loc)\n    o = bpy.context.object\n    o.name = name\n    o.data.materials.append(material)\n    return o\n\ndef add_actor(name, x, z, body_mat, accent_mat, scale=1.0):\n    body = sphere(name + '_Body', (x, 0, z + 1.0 * scale), (0.62 * scale, 0.42 * scale, 0.9 * scale), body_mat)\n    head = sphere(name + '_Head', (x, -0.02, z + 2.05 * scale), (0.55 * scale, 0.45 * scale, 0.55 * scale), accent_mat)\n    eye_l = sphere(name + '_EyeL', (x - 0.18 * scale, -0.41 * scale, z + 2.16 * scale), (0.07 * scale,) * 3, mat('Eye', (0.95, 0.95, 0.95, 1), roughness=0.25))\n    eye_r = sphere(name + '_EyeR', (x + 0.18 * scale, -0.41 * scale, z + 2.16 * scale), (0.07 * scale,) * 3, bpy.data.materials['Eye'])\n    pupil = mat('Pupil', (0.02, 0.02, 0.03, 1), roughness=0.3)\n    sphere(name + '_PupilL', (x - 0.18 * scale, -0.475 * scale, z + 2.16 * scale), (0.035 * scale,) * 3, pupil)\n    sphere(name + '_PupilR', (x + 0.18 * scale, -0.475 * scale, z + 2.16 * scale), (0.035 * scale,) * 3, pupil)\n    leg_l = cylinder(name + '_LegL', (x - 0.22 * scale, 0, z + 0.25 * scale), 0.12 * scale, 0.5 * scale, body_mat)\n    leg_r = cylinder(name + '_LegR', (x + 0.22 * scale, 0, z + 0.25 * scale), 0.12 * scale, 0.5 * scale, body_mat)\n    return [body, head, leg_l, leg_r]\n\ndef add_environment(text, motif, palette_index):\n    key = (motif + ' ' + text).lower()\n    ground_mat = mat('Ground', COLORS[palette_index % len(COLORS)])\n    cube('Ground', (0, 0, -0.25), (7.5, 5.5, 0.25), ground_mat)\n\n    if 'forest' in key or motif == 'forest':\n        trunk = mat('Trunk', (0.18, 0.09, 0.04, 1))\n        leaf = mat('Leaf', (0.08, 0.38, 0.15, 1))\n        for x in (-6, -4, 4, 6):\n            cylinder('TreeTrunk', (x, 1, 1.8), 0.35, 4.0, trunk)\n            sphere('TreeCrown', (x, 1, 4.0), (1.5, 1.2, 1.4), leaf)\n    elif 'city' in key or motif == 'city':\n        building = mat('Building', (0.12, 0.14, 0.18, 1), metallic=0.15)\n        for i, x in enumerate((-6, -3, 3, 6)):\n            cube('Building', (x, 1, 1.5 + (i % 2)), (1.1, 1.0, 1.5 + (i % 2)), building)\n    elif 'mountain' in key or motif == 'mountains':\n        rock = mat('Rock', (0.23, 0.25, 0.28, 1))\n        for x, s in ((-5, 2.0), (-1.5, 3.2), (2.2, 2.5), (5.5, 1.8)):\n            bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=s, radius2=0.0, depth=s * 2.3, location=(x, 2.0, s * 0.7))\n            bpy.context.object.data.materials.append(rock)\n    elif 'space' in key or motif == 'space':\n        moon = mat('Planet', (0.18, 0.24, 0.52, 1), metallic=0.0)\n        sphere('Planet', (4, 4, 4), (2.4, 2.4, 2.4), moon)\n    elif 'snow' in key or motif == 'snow':\n        snow = mat('Snow', (0.82, 0.86, 0.92, 1), roughness=0.85)\n        cube('SnowFloor', (0, 0, -0.22), (7.5, 5.5, 0.22), snow)\n        for x in (-5, -2, 2, 5):\n            sphere('SnowPile', (x, 1, 0.3), (1.2, 1.0, 0.4), snow)\n\ndef add_lighting(palette_index):\n    world = bpy.context.scene.world\n    if world is None:\n        world = bpy.data.worlds.new('AgonWorld')\n        bpy.context.scene.world = world\n    world.color = (0.02, 0.02, 0.035)\n    bpy.ops.object.light_add(type='AREA', location=(0, -3, 7))\n    key = bpy.context.object\n    key.name = 'KeyLight'\n    key.data.energy = 1200\n    key.data.shape = 'DISK'\n    key.data.size = 8\n    key.rotation_euler = (0.15, 0, 0)\n    bpy.ops.object.light_add(type='AREA', location=(-5, 1, 3))\n    fill = bpy.context.object\n    fill.data.energy = 500 + (palette_index % 3) * 150\n    fill.data.size = 5\n    fill.rotation_euler = (0.8, 0, -1.2)\n\ndef add_camera():\n    bpy.ops.object.camera_add(location=(0, -12, 4.2))\n    cam = bpy.context.object\n    cam.name = 'AgonCamera'\n    cam.data.lens = 52\n    bpy.context.scene.camera = cam\n    return cam\n\ndef point_camera(cam, target):\n    direction = Vector(target) - cam.location\n    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()\n\ndef add_dialogue_card(text, start, end):\n    # Optional readable dialogue marker in the 3D scene; the final captions are emitted separately.\n    bpy.ops.object.text_add(location=(0, 0.3, 0.15), rotation=(math.radians(90), 0, 0))\n    t = bpy.context.object\n    t.name = 'DialogueCue'\n    t.data.body = text[:140]\n    t.data.align_x = 'CENTER'\n    t.data.size = 0.32\n    t.hide_render = True\n    t.keyframe_insert(data_path='hide_render', frame=start)\n    t.hide_render = False\n    t.keyframe_insert(data_path='hide_render', frame=min(end, start + FPS * 0.1))\n    t.hide_render = True\n    t.keyframe_insert(data_path='hide_render', frame=end)\n\ndef build_scene(scene_data, scene_index, frame_start):\n    clear()\n    palette_index = int(scene_data.get('palette', 0))\n    text = scene_data.get('text', '')\n    motif = scene_data.get('motif', 'none')\n    add_environment(text, motif, palette_index)\n    add_lighting(palette_index)\n    character_a = add_actor('Hero', -2.0, 0, mat('HeroBody', (0.82, 0.34, 0.16, 1)), mat('HeroAccent', (0.98, 0.68, 0.30, 1)), 1.0)\n    character_b = add_actor('Partner', 2.0, 0, mat('PartnerBody', (0.12, 0.42, 0.54, 1)), mat('PartnerAccent', (0.48, 0.80, 0.82, 1)), 0.9)\n    frames = max(1, round(float(scene_data.get('duration', 4)) * FPS))\n    cam = add_camera()\n    point_camera(cam, (0, 0, 1.4))\n    cam.keyframe_insert(data_path='location', frame=frame_start)\n    cam.location.x = 1.0 if scene_data.get('camera') == 'push' else cam.location.x\n    cam.location.y = -10.5\n    point_camera(cam, (0, 0, 1.5))\n    cam.keyframe_insert(data_path='location', frame=frame_start + frames)\n    for obj in character_a[:2]:\n        obj.keyframe_insert(data_path='rotation_euler', frame=frame_start)\n        obj.rotation_euler.z += 0.06\n        obj.keyframe_insert(data_path='rotation_euler', frame=frame_start + frames // 2)\n        obj.rotation_euler.z -= 0.10\n        obj.keyframe_insert(data_path='rotation_euler', frame=frame_start + frames)\n    for obj in character_b[:2]:\n        obj.keyframe_insert(data_path='rotation_euler', frame=frame_start)\n        obj.rotation_euler.z -= 0.05\n        obj.keyframe_insert(data_path='rotation_euler', frame=frame_start + frames)\n    add_dialogue_card(text, frame_start, frame_start + frames)\n    scene = bpy.context.scene\n    scene.frame_start = frame_start\n    scene.frame_end = frame_start + frames\n    scene.render.filepath = str(OUTPUT_DIR / f'scene_{scene_index:03d}_')\n    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_DIR / f'scene_{scene_index:03d}.blend'))\n    return frame_start + frames\n\ndef main():\n    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)\n    scene = bpy.context.scene\n    scene.render.engine = 'BLENDER_EEVEE_NEXT'\n    scene.render.resolution_x = WIDTH\n    scene.render.resolution_y = HEIGHT\n    scene.render.resolution_percentage = 100\n    scene.render.fps = FPS\n    scene.render.image_settings.file_format = 'PNG'\n    scene.render.film_transparent = False\n    frame = 1\n    for index, scene_data in enumerate(PROJECT['scenes'], 1):\n        frame = build_scene(scene_data, index, frame) + 1\n    scene.frame_start = 1\n    scene.frame_end = max(1, frame - 1)\n    bpy.context.scene.render.filepath = str(OUTPUT_DIR / 'movie_')\n    print(f'Agon 3D build complete: {len(PROJECT["scenes"])} scenes')\n    print(f'Frames/blend files: {OUTPUT_DIR.resolve()}')\n    print('Next: render frames with Blender -b scene_001.blend -a, then assemble with FFmpeg.')\n\nif __name__ == '__main__':\n    main()\n`;
}

function ffmpegScript(project: Project): string {
  const { w, h } = canvasSize(project.aspect, project.quality);
  const title = project.title || 'agon-output';
  return `# Agon FFmpeg render helper\n# Run this after Blender has rendered PNG frames and local audio files exist.\n$Output = "${slugify(title)}.mp4"\n$FrameInput = "agon_frames/scene_001_####.png"\n# For multi-scene jobs, concatenate scene renders first or change FrameInput to your numbered master sequence.\nffmpeg -y -framerate 30 -i $FrameInput -c:v libx264 -pix_fmt yuv420p -s ${w}x${h} -movflags +faststart $Output\nWrite-Host "Rendered $Output"\n`;
}

export function createProjectExport(project: Project): ProjectExportFile[] {
  const base = slugify(project.title);
  const json = JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), project }, null, 2);
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

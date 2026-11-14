extends Node3D
## Utilidades compartidas: carga .glb desde frontend/public/models (sin copiarlos al proyecto)
## y fondo de estrellas real (NASA Tycho Star Map).

const MODELS := "../../frontend/public/models/"
const TEXTURES := "../../frontend/public/textures/"

func repo_path(rel: String) -> String:
	return ProjectSettings.globalize_path("res://").path_join(rel).simplify_path()

func load_glb(rel: String) -> Node3D:
	var path := repo_path(rel)
	var doc := GLTFDocument.new()
	var state := GLTFState.new()
	var err := doc.append_from_file(path, state)
	if err != OK:
		push_warning("No se pudo cargar " + path)
		return null
	var n: Node3D = doc.generate_scene(state)
	add_child(n)
	return n

func star_sky(energy: float = 1.0) -> Environment:
	var env := Environment.new()
	var img := Image.load_from_file(repo_path(TEXTURES + "stars.jpg"))
	if img:
		var sky_mat := PanoramaSkyMaterial.new()
		sky_mat.panorama = ImageTexture.create_from_image(img)
		sky_mat.energy_multiplier = energy
		var sky := Sky.new()
		sky.sky_material = sky_mat
		env.background_mode = Environment.BG_SKY
		env.sky = sky
	else:
		env.background_mode = Environment.BG_COLOR
		env.background_color = Color(0.02, 0.027, 0.05)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.55, 0.6, 0.7)
	env.ambient_light_energy = 0.25
	env.glow_enabled = true
	env.glow_bloom = 0.15
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	return env

## Dirección desde azimut (rad, desde el norte = -Z, hacia el este = +X) y elevación (grados).
func dir_from(az: float, el_deg: float) -> Vector3:
	var el := deg_to_rad(el_deg)
	return Vector3(sin(az) * cos(el), sin(el), -cos(az) * cos(el))

# --- cámara orbital simple: clic derecho + arrastrar, rueda = zoom ---
var cam: Camera3D
var yaw := 0.7
var pitch := 0.35
var dist := 26.0
var target := Vector3(0, 4, 0)
var min_dist := 3.0
var max_dist := 60.0

func setup_camera() -> void:
	cam = Camera3D.new()
	cam.far = 5000.0
	add_child(cam)

func update_camera() -> void:
	var off := Vector3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)) * dist
	cam.look_at_from_position(target + off, target)

func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventMouseMotion and (e.button_mask & MOUSE_BUTTON_MASK_RIGHT):
		yaw -= e.relative.x * 0.01
		pitch = clamp(pitch + e.relative.y * 0.01, -1.4, 1.4)
	elif e is InputEventMouseButton and e.pressed:
		if e.button_index == MOUSE_BUTTON_WHEEL_UP:
			dist = max(min_dist, dist * 0.92)
		elif e.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			dist = min(max_dist, dist * 1.08)
	elif e is InputEventKey and e.pressed and e.keycode == KEY_TAB:
		var next := "res://orbit.tscn" if get_tree().current_scene.scene_file_path.ends_with("preview.tscn") else "res://preview.tscn"
		get_tree().change_scene_to_file(next)

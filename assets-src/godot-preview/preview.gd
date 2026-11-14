extends Node3D
## Vista de prueba del módulo: el Sol da la vuelta al horizonte,
## SolarPanel lo sigue y Antenna apunta a la Tierra (como lo hará la app).
## Clic derecho + arrastrar: girar la cámara. Rueda: zoom.

var panel: Node3D
var antenna: Node3D
var sun: DirectionalLight3D
var sun_ball: MeshInstance3D
var cam: Camera3D
var t := 0.0
var yaw := 0.7
var pitch := 0.45
var dist := 11.0

func _ready() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.02, 0.027, 0.05)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.55, 0.6, 0.7)
	env.ambient_light_energy = 0.35
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	sun = DirectionalLight3D.new()
	sun.shadow_enabled = true
	sun.light_energy = 1.6
	add_child(sun)

	cam = Camera3D.new()
	add_child(cam)

	var ground := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(40, 40)
	ground.mesh = pm
	var gm := StandardMaterial3D.new()
	gm.albedo_color = Color(0.23, 0.23, 0.24)
	gm.roughness = 1.0
	ground.material_override = gm
	add_child(ground)

	sun_ball = _ball(Color(1.0, 0.71, 0.28))
	var earth_ball := _ball(Color(0.23, 0.51, 0.96))
	earth_ball.position = _dir(0.25, 12.0) * 12.0 + Vector3(0, 2, 0)

	var lander: Node3D = load("res://lander.glb").instantiate()
	add_child(lander)
	panel = lander.find_child("SolarPanel", true, false)
	antenna = lander.find_child("Antenna", true, false)
	print("SolarPanel encontrado: ", panel != null, " | Antenna encontrada: ", antenna != null)

func _ball(c: Color) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	var s := SphereMesh.new()
	s.radius = 0.4
	s.height = 0.8
	m.mesh = s
	var mat := StandardMaterial3D.new()
	mat.albedo_color = c
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.material_override = mat
	add_child(m)
	return m

## Dirección desde el azimut (rad, desde el norte = -Z, hacia el este = +X) y la elevación (grados).
func _dir(az: float, el_deg: float) -> Vector3:
	var el := deg_to_rad(el_deg)
	return Vector3(sin(az) * cos(el), sin(el), -cos(az) * cos(el))

func _process(delta: float) -> void:
	t += delta * 0.5
	var az := fmod(t, TAU)
	var el_deg := 6.0  # exagerado para ver sombras (en el polo es 1–2°)
	var d := _dir(az, el_deg)
	sun.look_at_from_position(d * 30.0, Vector3.ZERO)
	sun_ball.position = d * 12.0 + Vector3(0, 2, 0)
	if panel:
		panel.rotation = Vector3(deg_to_rad(el_deg), -az, 0)  # Y = azimut, X = inclinación
	if antenna:
		antenna.rotation = Vector3(deg_to_rad(12.0), -0.25, 0)
	var target := Vector3(0, 2, 0)
	var off := Vector3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)) * dist
	cam.look_at_from_position(target + off, target)

func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventMouseMotion and (e.button_mask & MOUSE_BUTTON_MASK_RIGHT):
		yaw -= e.relative.x * 0.01
		pitch = clamp(pitch + e.relative.y * 0.01, 0.05, 1.4)
	elif e is InputEventMouseButton and e.pressed:
		if e.button_index == MOUSE_BUTTON_WHEEL_UP:
			dist = max(4.0, dist - 0.7)
		elif e.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			dist = min(30.0, dist + 0.7)

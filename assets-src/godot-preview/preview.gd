extends "res://common.gd"
## Escena SUPERFICIE: módulo (Apolo adaptado) con panel y antena animados, rover, astronauta,
## el original de NASA para comparar, Sol y Tierra en el cielo y estrellas reales.
## Clic derecho + arrastrar: girar. Rueda: zoom. TAB: cambiar a la escena en órbita.

var panel: Node3D
var antenna: Node3D
var sun: DirectionalLight3D
var sun_body: Node3D
var earth_body: Node3D
var t := 0.0
const EARTH_AZ := 0.25
const EARTH_EL := 12.0

func _ready() -> void:
	star_sky(0.6)
	setup_camera()
	sun = DirectionalLight3D.new()
	sun.shadow_enabled = true
	sun.light_energy = 1.8
	sun.directional_shadow_max_distance = 80.0
	add_child(sun)

	var ground := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(200, 200)
	ground.mesh = pm
	var gm := StandardMaterial3D.new()
	gm.albedo_color = Color(0.36, 0.36, 0.37)
	gm.roughness = 1.0
	ground.material_override = gm
	add_child(ground)

	var lander := load_glb(MODELS + "lander.glb")
	if lander:
		panel = lander.find_child("SolarPanel", true, false)
		antenna = lander.find_child("Antenna", true, false)
		print("SolarPanel encontrado: ", panel != null, " | Antenna encontrada: ", antenna != null)

	var orig := load_glb("../../assets-src/models/apollo/apollo_original.glb")
	if orig:
		orig.position = Vector3(16, 0, 0)

	var rover := load_glb(MODELS + "rover.glb")
	if rover:
		rover.position = Vector3(-9, 0, 6)
		rover.rotation.y = deg_to_rad(35)

	var astro := load_glb(MODELS + "astronaut.glb")
	if astro:
		astro.position = Vector3(-4, 0, -5)
		astro.rotation.y = deg_to_rad(-20)

	sun_body = load_glb(MODELS + "sun.glb")
	earth_body = load_glb(MODELS + "earth.glb")
	if earth_body:
		earth_body.scale = Vector3.ONE * 2.5
		earth_body.position = dir_from(EARTH_AZ, EARTH_EL) * 90.0

func _process(delta: float) -> void:
	t += delta * 0.3
	var az := fmod(t, TAU)
	var el_deg := 6.0  # exagerado para ver sombras (en el polo es 1–2°)
	var d := dir_from(az, el_deg)
	sun.look_at_from_position(d * 50.0, Vector3.ZERO)
	if sun_body:
		sun_body.scale = Vector3.ONE * 2.0
		sun_body.position = d * 120.0
	if panel:
		panel.rotation = Vector3(deg_to_rad(el_deg), -az, 0)  # Y = azimut, X = inclinación
	if antenna:
		var e := dir_from(EARTH_AZ, EARTH_EL)
		antenna.rotation = Vector3(asin(e.y), -EARTH_AZ, 0)
	update_camera()

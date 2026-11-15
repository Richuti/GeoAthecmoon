extends "res://common.gd"
## Escena ÓRBITA (portada): la Luna con el polo sur hacia la cámara, los 6 sitios marcados,
## el LRO (la nave que midió el relieve LOLA) en órbita y el Gateway de Artemis.
## Clic derecho + arrastrar: girar. Rueda: zoom. TAB: volver a la superficie.

var moon: Node3D
var lro: Node3D
var gateway: Node3D
var t := 0.0
const MOON_R := 10.0

func _ready() -> void:
	star_sky(1.0)
	setup_camera()
	target = Vector3.ZERO
	dist = 32.0
	pitch = -0.9  # mirando desde el sur
	min_dist = 13.0
	max_dist = 120.0
	var sun := DirectionalLight3D.new()
	sun.light_energy = 2.0
	sun.look_at_from_position(Vector3(10, 1, 3), Vector3.ZERO)
	add_child(sun)

	moon = load_glb(MODELS + "moon.glb")
	if moon:
		moon.scale = Vector3.ONE * MOON_R
		for c in moon.find_children("site-*", "", true, false):
			var m := MeshInstance3D.new()
			var s := SphereMesh.new()
			s.radius = 0.012
			s.height = 0.024
			m.mesh = s
			var mat := StandardMaterial3D.new()
			mat.albedo_color = Color(1.0, 0.71, 0.28)
			mat.emission_enabled = true
			mat.emission = Color(1.0, 0.71, 0.28)
			mat.emission_energy_multiplier = 3.0
			m.material_override = mat
			c.add_child(m)
		print("Sitios en la Luna: ", moon.find_children("site-*", "", true, false).size())

	lro = load_glb(MODELS + "lro.glb")
	if lro:
		lro.scale = Vector3.ONE * 0.25
	gateway = load_glb(MODELS + "gateway.glb")
	if gateway:
		gateway.scale = Vector3.ONE * 0.04
		gateway.position = Vector3(-14, -6, 4)

func _process(delta: float) -> void:
	t += delta
	if moon:
		moon.rotation.y = t * 0.05
	if lro:  # órbita polar baja
		var a := t * 0.4
		lro.position = Vector3(0, sin(a), cos(a)) * (MOON_R * 1.12)
		lro.look_at(Vector3.ZERO, Vector3.RIGHT)
	update_camera()

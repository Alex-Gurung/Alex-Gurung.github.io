// create the particle variables
var particleCount = 1800,
    particles = new THREE.Geometry(),
    pMaterial = new THREE.ParticleBasicMaterial({
        color: 0xFFFFFF,
        size: 20
    });

// now create the individual particles
for (var p = 0; p < particleCount; p++) {

    // create a particle with random
    // position values, -250 -> 250
    var pX = Math.random() * 500 - 250,
        pY = Math.random() * 500 - 250,
        pZ = Math.random() * 500 - 250,
        particle = new THREE.Vertex(
            new THREE.Vector3(pX, pY, pZ)
        );

    // add it to the geometry
    particles.vertices.push(particle);
}

// create the particle system
var particleSystem = new THREE.ParticleSystem(
    particles,
    pMaterial);

// add it to the scene
scene.addChild(particleSystem);
// create the particle variables
var pMaterial = new THREE.ParticleBasicMaterial({
  color: 0xFFFFFF,
  size: 20,
  map: THREE.ImageUtils.loadTexture(
    "images/particle.png"
  ),
  blending: THREE.AdditiveBlending,
  transparent: true
});

// also update the particle system to
// sort the particles which enables
// the behaviour we want
particleSystem.sortParticles = true;
// animation loop
function update() {

  // add some rotation to the system
  particleSystem.rotation.y += 0.01;

  // draw
  renderer.render(scene, camera);

  // set up the next call
  requestAnimFrame(update);
}
// create a velocity vector
particle.velocity = new THREE.Vector3(
  0,              // x
  -Math.random(), // y: random vel
  0);             // z
  // animation loop
function update() {

  // add some rotation to the system
  particleSystem.rotation.y += 0.01;

  var pCount = particleCount;
  while (pCount--) {

    // get the particle
    var particle =
      particles.vertices[pCount];

    // check if we need to reset
    if (particle.position.y < -200) {
      particle.position.y = 200;
      particle.velocity.y = 0;
    }

    // update the velocity with
    // a splat of randomniz
    particle.velocity.y -= Math.random() * .1;

    // and the position
    particle.position.addSelf(
      particle.velocity);
  }

  // flag to the particle system
  // that we've changed its vertices.
  particleSystem.
    geometry.
    __dirtyVertices = true;

  // draw
  renderer.render(scene, camera);

  // set up the next call
  requestAnimFrame(update);
}
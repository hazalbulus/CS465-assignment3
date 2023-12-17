let canvas;
let gl;
let program;
let selectedTexture = 0;
const cameraSpeed = 2;
let wireMode = 0;
let magnitude = 0.5;
let mesh;
let aa = 0.5;
let uValue = 14; // Single value for u, controlled by a slider
let vValue = 37.4; // Single value for v, controlled by a slider
let vMin = -14,
  vMax = 14;
let uMin = -37.4,
  uMax = 37.4;

const line_count = 100;
let radius = 160;
let xRot = 110;
let yRot = 180;
let zRot = 0;
let rotationMode = true;
let rotAngle = 0;
let viewMatrix;
let projectionMatrix;

// Throttling function to prevent regenerateBreatherSurface from being called too frequently
let throttleTimer;
const throttle = (callback, time) => {
  if (throttleTimer) return;

  throttleTimer = true;
  setTimeout(() => {
    callback();
    throttleTimer = false;
  }, time);
};

// scale in MV does not work
function scale4(a, b, c) {
  const result = mat4();
  result[0][0] = a;
  result[1][1] = b;
  result[2][2] = c;
  return result;
}
// Checks if the given value is power of 2
function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

// Breather surface equations
function breatherX(u, v, a) {
  const w = Math.sqrt(1 - a * a);
  const denom =
    a * (Math.pow(w * Math.cosh(a * u), 2) + Math.pow(a * Math.sin(w * v), 2));
  return -u + (2 * (1 - a * a) * Math.cosh(a * u) * Math.sinh(a * u)) / denom;
}

function breatherY(u, v, a) {
  const w = Math.sqrt(1 - a * a);
  const denom =
    a * (Math.pow(w * Math.cosh(a * u), 2) + Math.pow(a * Math.sin(w * v), 2));
  return (
    (2 *
      w *
      Math.cosh(a * u) *
      (-w * Math.cos(v) * Math.cos(w * v) - Math.sin(v) * Math.sin(w * v))) /
    denom
  );
}

function breatherZ(u, v, a) {
  const w = Math.sqrt(1 - a * a);
  const denom =
    a * (Math.pow(w * Math.cosh(a * u), 2) + Math.pow(a * Math.sin(w * v), 2));
  return (
    (2 *
      w *
      Math.cosh(a * u) *
      (-w * Math.sin(v) * Math.cos(w * v) + Math.cos(v) * Math.sin(w * v))) /
    denom
  );
}

// Calculation of distance between two point
function distance(p1, p2) {
  return Math.sqrt(
    Math.pow(p1[0] - p2[0], 2) +
      Math.pow(p1[1] - p2[1], 2) +
      Math.pow(p1[2] - p2[2], 2)
  );
}

window.onload = function () {
  canvas = document.getElementById("render-surface");
  gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) return alert("Your browser does not support WEBGL");
  program = initShaders(gl, "vertexShader", "fragmentShader");
  gl.useProgram(program);
  gl.bindTexture(gl.TEXTURE_2D, texture(gl, "erdem"));
  gl.activeTexture(gl.TEXTURE0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.frontFace(gl.CCW);
  gl.cullFace(gl.BACK);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1.0);

  document.onkeydown = function (event) {
    switch (event.keyCode) {
      case 87:
        xRot += cameraSpeed;
        break;
      case 83:
        xRot -= cameraSpeed;
        break;
      case 38:
        event.preventDefault();
        radius -= cameraSpeed;
        break;
      case 40:
        event.preventDefault();
        radius += cameraSpeed;
        break;
    }
    updateViewMatrix();
  };

  let checkbox = document.getElementById("checkbox");
  checkbox.addEventListener("change", function () {
    wireMode = this.checked ? 1 : 0;
  });

  let textureSelector = document.getElementById("textureSelector");
  textureSelector.addEventListener("click", function () {
    selectedTexture = textureSelector.selectedIndex;
    if (selectedTexture == 0) {
      gl.bindTexture(gl.TEXTURE_2D, texture(gl, "erdem"));
    } else if (selectedTexture == 1) {
      gl.bindTexture(gl.TEXTURE_2D, texture(gl, "aytek"));
    } else if (selectedTexture == 2) {
      gl.bindTexture(gl.TEXTURE_2D, texture(gl, "mustafa"));
    }
    gl.activeTexture(gl.TEXTURE0);
  });

  document.getElementById("toggleRotation").onclick = function () {
    rotationMode = !rotationMode;
  };

  document.getElementById("aa").oninput = function () {
    aa = parseFloat(document.getElementById("aa").value);
    throttle(regenerateBreatherSurface, 100);
  };

  document.getElementById("u-range").oninput = function () {
    uValue = parseFloat(document.getElementById("u-range").value);
    throttle(regenerateBreatherSurface, 100);
  };

  document.getElementById("v-range").oninput = function () {
    vValue = parseFloat(document.getElementById("v-range").value);
    throttle(regenerateBreatherSurface, 100);
  };

  document.getElementById("magnitude").oninput = function () {
    magnitude = parseFloat(document.getElementById("magnitude").value);
    if (mesh) mesh.setScale(magnitude);
    throttle(updateMesh, 100); // Throttle calls to 100ms
  };

  regenerateBreatherSurface();
  updateViewMatrix();
  render();
};

function regenerateBreatherSurface() {
  console.log("uValue: " + uValue);
  console.log("vValue: " + vValue);
  mesh = new Mesh(breatherSurface(line_count, line_count, aa, uValue, vValue));
  mesh.setScale(magnitude);
  mesh.setWireMode(wireMode);
  updateViewMatrix();
}

function updateMesh() {
  if (mesh) {
    mesh.updateVertices(
      breatherSurface(line_count, line_count, aa, uValue, vValue)
    );
    mesh.setScale(magnitude);
    mesh.setWireMode(wireMode);
  }
}

function updateViewMatrix() {
  viewMatrix = createViewMatrix(radius, xRot, yRot, zRot);
}

function render() {
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
  if (!projectionMatrix) {
    projectionMatrix = perspective(
      radians(110),
      canvas.width / canvas.height,
      0.1,
      1000000.0
    );
  }
  if (rotationMode) {
    rotAngle += 0.5;
  }
  if (mesh) {
    mesh.setRotation(rotAngle, rotAngle, rotAngle);
    mesh.render(gl, program, viewMatrix, projectionMatrix);
  }
  requestAnimationFrame(render);
}

function createViewMatrix(radius, xRot, yRot, zRot) {
  let viewMatrix = mat4();
  viewMatrix = lookAt(vec3(0, 0, radius), vec3(0, 0, 0), vec3(0, 1, 0));
  viewMatrix = mult(viewMatrix, rotate(xRot, vec3(1, 0, 0)));
  viewMatrix = mult(viewMatrix, rotate(yRot, vec3(0, 1, 0)));
  viewMatrix = mult(viewMatrix, rotate(zRot, vec3(0, 0, 1)));
  return viewMatrix;
}

// Setups texture
function texture(gl, name) {
  let ext = gl.getExtension("MOZ_EXT_texture_filter_anisotropic");
  if (!ext) ext = gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");

  const image = document.getElementById(name);
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  if (isPowerOf2(image.width) && isPowerOf2(image.height))
    gl.generateMipmap(gl.TEXTURE_2D);
  else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  gl.bindTexture(gl.TEXTURE_2D, null);

  return t;
}

function breatherSurface(N, M, aa, uValue, vValue) {
  let vertices = [];
  let normals = [];
  let textureCoords = [];
  let w = Math.sqrt(1 - aa * aa);

  let uMin = -uValue;
  let uMax = uValue;
  let vMin = -vValue;
  let vMax = vValue;

  let uStep = (uMax - uMin) / N;
  let vStep = (vMax - vMin) / M;

  for (let i = 0; i <= N; i++) {
    let u = uMin + i * uStep;
    for (let j = 0; j <= M; j++) {
      let v = vMin + j * vStep;

      let cosh_au = Math.cosh(aa * u);
      let sinh_au = Math.sinh(aa * u);
      let sin_wv = Math.sin(w * v);
      let cos_wv = Math.cos(w * v);
      let cos_v = Math.cos(v);
      let sin_v = Math.sin(v);

      let denom = aa * (w * cosh_au * w * cosh_au + aa * sin_v * aa * sin_v);
      let x = -u + (2 * (1 - aa * aa) * cosh_au * sinh_au) / denom;
      let y =
        (2 * w * cosh_au * (-w * cos_v * cos_wv - sin_v * sin_wv)) / denom;
      let z =
        (2 * w * cosh_au * (-w * sin_v * cos_wv + cos_v * sin_wv)) / denom;

      vertices.push(x, y, z);
      normals.push(0, 0, 1);
      textureCoords.push(i / N, j / M);
    }
  }
  return [vertices, normals, textureCoords];
}

// Mesh object
class Mesh {
  constructor(data) {
    this.vertices = data[0];
    this.texCoords = data[1];
    this.normals = data[2];

    this.translation = vec3(0, 0, 0);
    this.rotation = vec3(0, 0, 0);
    this.scale = 1;

    this.wireMode = 0;
  }

  updateVertices(data) {
    this.vertices = data[0];
    this.texCoords = data[1];
    this.normals = data[2];

    // Update buffer data instead of recreating buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(this.vertices));

    gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(this.texCoords));

    gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(this.normals));
  }

  prepareModel(gl, program, viewMatrix, projectionMatrix) {
    gl.useProgram(program);

    let positionAttribLocation = gl.getAttribLocation(program, "vPosition");
    let texCoordAttribLocation = gl.getAttribLocation(program, "vTexCoord");
    let normalAttribLocation = gl.getAttribLocation(program, "vNormal");

    this.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.vertices),
      gl.STATIC_DRAW
    );

    this.tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.texCoords),
      gl.STATIC_DRAW
    );

    this.nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.normals),
      gl.STATIC_DRAW
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.vertexAttribPointer(
      positionAttribLocation,
      3,
      gl.FLOAT,
      gl.FALSE,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0
    );
    gl.enableVertexAttribArray(positionAttribLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
    gl.vertexAttribPointer(
      texCoordAttribLocation,
      2,
      gl.FLOAT,
      gl.FALSE,
      2 * Float32Array.BYTES_PER_ELEMENT,
      0
    );
    gl.enableVertexAttribArray(texCoordAttribLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
    gl.vertexAttribPointer(
      normalAttribLocation,
      3,
      gl.FLOAT,
      gl.TRUE,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0
    );
    gl.enableVertexAttribArray(normalAttribLocation);

    gl.uniformMatrix4fv(
      gl.getUniformLocation(program, "modelMatrix"),
      gl.FALSE,
      flatten(this.createTranformationMatrix())
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(program, "viewMatrix"),
      gl.FALSE,
      flatten(viewMatrix)
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(program, "projectionMatrix"),
      gl.FALSE,
      flatten(projectionMatrix)
    );

    gl.uniform1f(gl.getUniformLocation(program, "wireMode"), this.wireMode);

    // Organize cordinates for texture drawing
    this.triangleStrip = null;
    this.triangleStrip = new Uint16Array(
      line_count * (2 * (line_count + 1) + 2) - 2
    );
    let n = 0;
    for (let i = 0; i < line_count; i++) {
      for (let j = 0; j <= line_count; j++) {
        this.triangleStrip[n++] = (i + 1) * (line_count + 1) + j;
        this.triangleStrip[n++] = i * (line_count + 1) + j;
      }
    }

    // Organize cordinates for wireframe
    if (this.wireMode == 0) {
      let lines = [];
      lines.push(this.triangleStrip[0], this.triangleStrip[1]);
      let numStripIndices = this.triangleStrip.length;

      for (let i = 2; i < numStripIndices; i++) {
        let a = this.triangleStrip[i - 2];
        let b = this.triangleStrip[i - 1];
        let c = this.triangleStrip[i];

        if (a != b && b != c && c != a) lines.push(a, c, b, c);
      }

      this.wireframe = new Uint16Array(lines);
    }

    this.triangleStripBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleStripBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.triangleStrip, gl.STATIC_DRAW);

    this.linebuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.linebuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.wireframe, gl.STATIC_DRAW);
  }

  createTranformationMatrix() {
    let matrix = mat4();
    matrix = mult(
      matrix,
      translate(this.translation[0], this.translation[1], this.translation[2])
    );
    matrix = mult(matrix, rotate(this.rotation[0], vec3(1, 0, 0)));
    matrix = mult(matrix, rotate(this.rotation[1], vec3(0, 1, 0)));
    matrix = mult(matrix, rotate(this.rotation[2], vec3(0, 0, 1)));

    matrix = mult(matrix, scale4(this.scale, this.scale, this.scale));
    return matrix;
  }
  //Render function of the mesh object
  render(gl, program, viewMatrix, projectionMatrix) {
    this.prepareModel(gl, program, viewMatrix, projectionMatrix);

    if (this.wireMode == 0) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.linebuffer);
      gl.drawElements(gl.LINES, this.wireframe.length, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleStripBuffer);
      gl.drawElements(
        gl.TRIANGLE_STRIP,
        this.triangleStrip.length,
        gl.UNSIGNED_SHORT,
        0
      );
    }
  }

  setRotation(x, y, z) {
    this.rotation = vec3(x, y, z);
  }

  setScale(s) {
    this.scale = s;
  }

  setWireMode(mode) {
    this.wireMode = mode;
  }
}

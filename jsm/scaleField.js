
const LAMBDA = 0.01
const LAMBDA2 = 0.0001
const N = 57
const K = 1
const DBL_MAX = Number.MAX_VALUE
const D_T = 0.25

class ScaleField {

	constructor(width, height, depth, dataBuffer, rgba) {
		this.dims = new Uint16Array([width, height, depth])
		this.rgba = rgba

		let arraySize = this.dims[2] * this.dims[1] * this.dims[0]
		this.laplacianValue = [new Float64Array(arraySize), new Float64Array(arraySize), new Float64Array(arraySize)]
		this.volumeData = [new Float64Array(dataBuffer), new Float64Array(arraySize), new Float64Array(arraySize)]

		this.t = new Float64Array(arraySize)
		this.sizeData = new Uint8Array(arraySize)
		this.alpha = new Uint8Array(dataBuffer)

		let sizeMax = 0.0;
		let sizeMin = DBL_MAX;

		this.used = false

		this.add = function () {
			let temp = this.volumeData[0]
			this.volumeData[0] = this.volumeData[1]
			this.volumeData[1] = this.volumeData[2]
			this.volumeData[2] = temp
		}

		this.laplacian = function(x, y, z, t) {
			let wh = this.dims[1] * this.dims[0]
			let vol = this.volumeData[t]
			let index = x * wh + y * this.dims[0] + z
			let sum = (-6) * vol[index]
			

			if ((x - 1) >= 0 ) {
				sum += vol[index - wh]
			}
			else {
				sum += vol[index + wh]
			}

			if ((x + 1) >= this.dims[2]) {
				sum += vol[index - wh]
			}
			else {
				sum += vol[index + wh]
			}

			if ((y - 1) >= 0) {
				sum += vol[index - this.dims[0]]
			}
			else {
				sum += vol[index + this.dims[0]]
			}

			if ((y + 1) >= this.dims[2]) {
				sum += vol[index - this.dims[0]]
			}
			else {
				sum += vol[index + this.dims[0]]
			}

			if ((z - 1) >= 0) {
				sum += vol[index - 1]
			}
			else {
				sum += vol[index + 1]
			}

			if ((z + 1) >= this.dims[2]) {
				sum += vol[index - 1]
			}
			else {
				sum += vol[index + 1]
			}

			return Math.abs(sum)
		}

		this.scaleDetection = function(index, t) {
			if (this.t[index] == (N - 1) && this.laplacianValue[1][index] > this.laplacianValue[0][index] && this.laplacianValue[1][index] > this.laplacianValue[2][index])
				this.t[index] = t - 1.0;

			this.laplacianValue[0][index] = this.laplacianValue[1][index];
			this.laplacianValue[1][index] = this.laplacianValue[2][index];
		}

		function theta(d, h) {
			h = h * K;

			let temp = 1.0 - (d / h);

			if (temp > 1.0)
				temp = 1.0;
			else if (temp < 0.0)
				temp = 0.0;
			
			temp = Math.pow(temp, 4);

			return temp * (((4 * d) / h) + 1.0);
		}

		this.dotInterp = function(temp, x, y, z) {
			let index = x * (this.dims[1]) * (this.dims[0]) + y * (this.dims[0]) + z;
			//console.log(this.alpha[index], index)
			if (this.rgba[3][this.alpha[index]] > 0) {

				let t = (this.t[index]) * D_T
				let n = parseInt(t)
				let d, offset;

				let iInit = (x - n >= 0) ? -n : -x
				let jInit = (y - n >= 0) ? -n : -y
				let kInit = (z - n >= 0) ? -n : -z

				for (let i = iInit; (i <= n) && ((i + x) < this.dims[2]); i++) {
					for (let j = jInit, iStep = i * (this.dims[1]) * (this.dims[0]); (j <= n) && ((j + y) < this.dims[1]); j++) {
						for (let k = kInit, jStep = j * (this.dims[0]); (k <= n) && ((k + z) < this.dims[0]); k++) {
							offset = index + iStep + jStep + k;
							d = Math.sqrt(i * i + j * j + k * k);

							temp[offset] += (theta(d, t)) * t;
							if (sizeMax < temp[offset])
								sizeMax = temp[offset];
							if (sizeMin > temp[offset])
								sizeMin = temp[offset];
						}
					}
				}
			}
		}

		this.interp = function(){
			sizeMax = 0.0;
			sizeMin = DBL_MAX;

			let temp = new Float64Array(this.dims[2] * this.dims[1] * this.dims[0]).fill(0)

			for (let i = 0; i < this.dims[2]; i++)
				for (let j = 0; j < this.dims[1]; j++)
					for (let k = 0; k < this.dims[0]; k++)
						this.dotInterp(temp, i, j, k);

			//console.log(temp)
			let diff = sizeMax - sizeMin
			if (diff > 0.0) {
				for (let i = 0; i < this.sizeData.length; i++) {
					this.sizeData[i] = ((temp[i] - sizeMin) * 255.0) / diff + 0.5
					//console.log(((temp[i] - sizeMin) * 255.0) / diff + 0.5)
				}
				
			}
			this.used = true;
		}

	}

	process(onprogress, onload) {
		if (!this.used) {
			let gaussian1 = new Gaussian(1)
			gaussian1.diff(this, (volume, progress) => {
				if (onprogress instanceof Function) {
					onprogress(volume, progress)
                }
				
				if (progress == 1) {
					this.interp()
					if (onload instanceof Function) {
						onload()
					}
				}
			})
		}

    }
}

class Gaussian {

	constructor(n) {

		let size = 2 * n + 1
		let size2 = Math.pow(size, 2)
		let size3 = Math.pow(size, 3)
		let dt = D_T
		let coeff = new Float64Array(size3)

		let C = function (x) {
			if (x > 0)
				return LAMBDA2 / (LAMBDA2 + x * x / 65535);
			return 1.0
		}

		let phi = function (x) {
			return x * C(x)
		}

		let dotDiff = function (data, temp, dotI, dotJ, dotK) {

			let dotOffset, coeffOffset
			let sum = 0
			let n = (size - 1) / 2

			let iInit = (dotI >= n) ? -n : -dotI
			let jInit = (dotJ >= n) ? -n : -dotJ
			let kInit = (dotK >= n) ? -n : -dotK

			let dotIndex = dotI * data.dims[1] * data.dims[0] + dotJ * data.dims[0] + dotK
			let coeffIndex = (size2 + size + 1) * n

			let vol1 = data.volumeData[temp]
			let vol2 = data.volumeData[temp + 1]

			vol2[dotIndex] = 0

			for (let i = iInit; (i <= n) && ((i + dotI) < data.dims[2]); i++) {
				for (let j = jInit, iStep = i * (data.dims[1]) * (data.dims[0]); (j <= n) && ((j + dotJ) < data.dims[1]); j++) {
					for (let k = kInit, jStep = j * (data.dims[0]); (k <= n) && ((k + dotK) < data.dims[0]); k++) {
						dotOffset = iStep + jStep + k;
						coeffOffset = i * size2 + j * size + k;
						vol2[dotIndex] += phi(vol1[dotIndex + dotOffset] - vol1[dotIndex]) * (coeff[coeffIndex + coeffOffset]);
						
						sum += (coeff[coeffIndex + coeffOffset]);
					}
				}
			}

			if (sum != 1.0)
				vol2[dotIndex] /= sum;

			vol2[dotIndex] = vol2[dotIndex] * (dt) + vol1[dotIndex];
		}

		this.compCoeff = function(t) {
			let i, j, k
			let n = (size - 1) / 2
			let index = 0
			let sum = 0

			for (i = -n; i <= n; i++) {
				for (j = -n; j <= n; j++) {
					for (k = -n; k <= n; k++) {
						coeff[index] = Math.exp(-(i * i + j * j + k * k) / (2 * t)) / (2 * Math.PI * t)
						sum += coeff[index]
						index++
					}
				}
			}

			coeff = coeff.map(x => x / sum)
		}

		this.diff = function (data, onload) {
			let tmp = new ScaleField(data.dims[0], data.dims[1], data.dims[2], new Uint8Array(data.alpha), data.rgba)
			let index = 0;

			for (let i = 0; i < data.dims[2]; i++)
				for (let j = 0; j < data.dims[1]; j++)
					for (let k = 0; k < data.dims[0]; k++)
						dotDiff(data, 0, i, j, k);

			//console.log("iteration: 1\n");
			index = 0;

			for (let i = 0; i < data.dims[2]; i++) {
				for (let j = 0; j < data.dims[1]; j++) {
					for (let k = 0; k < data.dims[0]; k++) {
						data.laplacianValue[0][index] = 0.0
						data.laplacianValue[1][index] = data.laplacian(i, j, k, 1)
						dotDiff(data, 1, i, j, k)
						tmp.alpha[index] = data.volumeData[1][index]
						data.t[index] = N - 1
						index++
					}
				}
			}
			onload(tmp, 2/N )
			//console.log("iteration: 2\n");

			let loop = function (t) {
				index = 0;
				data.add();
				for (let i = 0; i < data.dims[2]; i++) {
					for (let j = 0; j < data.dims[1]; j++) {
						for (let k = 0; k < data.dims[0]; k++) {
							data.laplacianValue[2][index] = data.laplacian(i, j, k, 1) * t;
							dotDiff(data, 1, i, j, k);
							tmp.alpha[index] = data.volumeData[1][index]
							data.scaleDetection(index, t);
							index++;
						}
					}
				}

				onload(tmp, (t) / N)
				//console.log("iteration: %d\n", t + 1);
				if (t < N) {
					t++
					setTimeout(() => {
						loop(t)
					}, 5)
                }
			}
			loop(2)
		}

		this.compCoeff(D_T)
	}
}

export { ScaleField, Gaussian }

class HSVType {
    constructor() {
        this.H = 0
        this.S = 0
        this.V = 0
    }

    set(h, s, v) {
        this.H = h
        this.S = s
        this.V = v

        return this
    }

    
     to_RGB = function () {

         let h = this.H, s = this.S, v = this.V;
        let rgb = new RGBType()

        if (h == -1) {
            rgb.set(v, v, v)
            return rgb
        }

        let i = Math.floor(h);
        let f = h - i;

        if (!(i & 1))
            f = 1 - f; // if i is even

        let m = v * (1 - s);
        let n = v * (1 - s * f);

        switch (i) {
            case 0:
                rgb.set(v, n, m)
                break
            case 1:
                rgb.set(n, v, m)
                break
            case 2:
                rgb.set(m, v, n)
                break
            case 3:
                rgb.set(m, n, v)
                break
            case 4:
                rgb.set(n, m, v)
                break
            case 5:
                rgb.set(v, m, n)
                break
        }

        return rgb
    }
}

class RGBType {
    constructor() {
        this.R = 0
        this.G = 0
        this.B = 0
    }

    set(r, g, b) {
        this.R = r
        this.G = g
        this.B = b

        return this
    }
}


export {
    RGBType, HSVType
}
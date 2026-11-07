#!/usr/bin/env python3
"""LUMIERE APK packager (v3+; v5 also locks the app to landscape). Re-uses the proven WebView wrapper (classes.dex, resources, manifest) from a base APK, swaps in assets/www,
bumps versionCode/versionName in place, and signs with APK Signature Scheme v2 (needs `cryptography`; Termux: pkg install python-cryptography).
usage: make-apk.py BASE.apk WWW_DIR OUT.apk [versionCode] [versionName(4 chars)] [orientation: landscape|any]
NOT install-tested by this script: it self-verifies digests + signature only."""
import sys, os, io, zipfile, struct, hashlib, datetime
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding

SENSOR_LANDSCAPE, UNSPECIFIED = 6, 0xffffffff   # android:screenOrientation values (sensorLandscape: either landscape side, follows the sensor, like games)
def patch_manifest(d, vcode, vname, orient=SENSOR_LANDSCAPE):
    d = bytearray(d); u16 = lambda o: struct.unpack_from('<H', d, o)[0]; u32 = lambda o: struct.unpack_from('<I', d, o)[0]; off = 8; strs = []
    while off < len(d):
        t, sz = u16(off), u32(off + 4)
        if t == 1:
            n = u32(off + 8); fl = u32(off + 16); base = off + u32(off + 20)
            for i in range(n):
                p = base + u32(off + 28 + 4 * i)
                if fl & 0x100:
                    l = d[p]; p += 1
                    if l & 0x80: p += 1
                    l2 = d[p]; p += 1; strs.append((bytes(d[p:p + l2]).decode('utf8', 'replace'), p, l2, True))
                else:
                    l = u16(p); p += 2; strs.append((bytes(d[p:p + 2 * l]).decode('utf16', 'replace'), p, 2 * l, False))
        elif t == 0x102:
            ac = u16(off + 28); ao = off + 36
            for i in range(ac):
                ans, an, ar, tsz, _, tt, td = struct.unpack_from('<iiiHBBI', d, ao + 20 * i); nm = strs[an][0]
                if nm == 'versionCode': struct.pack_into('<I', d, ao + 20 * i + 16, vcode)
                if nm == 'screenOrientation' and tt == 0x10: struct.pack_into('<I', d, ao + 20 * i + 16, orient)
                if nm == 'versionName' and ar >= 0:
                    s, p, l, u8 = strs[ar]; nb = vname.encode('utf8' if u8 else 'utf-16-le'); assert len(nb) == l, 'versionName must keep the same length'; d[p:p + l] = nb
        off += sz
    return bytes(d)

def build_unsigned(base, www, out, vcode, vname, orient=SENSOR_LANDSCAPE):
    zin = zipfile.ZipFile(base); zout = zipfile.ZipFile(out, 'w'); kept = []
    def add(name, data, store):
        zi = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_STORED if store else zipfile.ZIP_DEFLATED; zi.external_attr = 0o644 << 16; extra = b''
        if store:
            pos = zout.fp.tell(); pad = (-(pos + 30 + len(name.encode()))) % 4
            if pad: pad = pad if pad >= 4 else pad + 4; extra = struct.pack('<HH', 0xD935, pad - 4) + b'\0' * (pad - 4)
        zi.extra = extra; zout.writestr(zi, data, compresslevel=9 if not store else None)
    for zi in zin.infolist():
        n = zi.filename
        if n.startswith('META-INF/') or n.startswith('assets/www/') or n.endswith('/'): continue
        # the old app's root-level assets (fonts/*.woff2, noise.png) are never read: the wrapper serves only assets/www/ and the dex holds no
        # reference to them, and the web app ships its own fonts and builds its noise procedurally -> leave them out (~82 KB)
        if n.startswith('assets/'): print('  dropped unused wrapper asset', n); continue
        data = zin.read(n)
        if n == 'AndroidManifest.xml': data = patch_manifest(data, vcode, vname, orient)
        add(n, data, zi.compress_type == zipfile.ZIP_STORED); kept.append(n)
    cnt = 0
    for root, dirs, files in os.walk(www):
        dirs.sort()   # walk order must not depend on the filesystem: same source -> byte-identical APK on any device
        for f in sorted(files):
            full = os.path.join(root, f); rel = 'assets/www/' + os.path.relpath(full, www).replace(os.sep, '/')
            add(rel, open(full, 'rb').read(), f.endswith(('.woff2', '.png', '.jpg'))); cnt += 1
    zout.close(); return kept, cnt

def keypair(keydir):
    os.makedirs(keydir, exist_ok=True); kp, cp = os.path.join(keydir, 'lumiere-debug-key.pem'), os.path.join(keydir, 'lumiere-debug-cert.pem')
    if os.path.exists(kp) and os.path.exists(cp):
        return serialization.load_pem_private_key(open(kp, 'rb').read(), None), x509.load_pem_x509_certificate(open(cp, 'rb').read())
    key = rsa.generate_private_key(65537, 2048); name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'LUMIERE debug'), x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'buddyapps')])
    now = datetime.datetime(2026, 1, 1); cert = x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now).not_valid_after(now + datetime.timedelta(days=36500)).sign(key, hashes.SHA256())
    open(kp, 'wb').write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())); open(cp, 'wb').write(cert.public_bytes(serialization.Encoding.PEM)); return key, cert

CH = 1 << 20
def chunks_digest(parts):
    digs = []
    for p in parts:
        for i in range(0, len(p), CH): c = p[i:i + CH]; digs.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(c)) + c).digest())
    return hashlib.sha256(b'\x5a' + struct.pack('<I', len(digs)) + b''.join(digs)).digest()
lp = lambda b: struct.pack('<I', len(b)) + b

def sign_v2(unsigned, out, key, cert):
    data = open(unsigned, 'rb').read(); e = data.rfind(b'PK\x05\x06'); cd_size, cd_off = struct.unpack('<II', data[e + 12:e + 20])
    s1, s3, s4 = data[:cd_off], data[cd_off:cd_off + cd_size], data[e:]; digest = chunks_digest([s1, s3, s4])
    signed = lp(lp(struct.pack('<I', 0x0103) + lp(digest))) + lp(lp(cert.public_bytes(serialization.Encoding.DER))) + lp(b'')
    sig = key.sign(signed, padding.PKCS1v15(), hashes.SHA256()); pub = cert.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    signer = lp(signed) + lp(lp(struct.pack('<I', 0x0103) + lp(sig))) + lp(pub); value = lp(lp(signer)); pair = struct.pack('<QI', 4 + len(value), 0x7109871a) + value
    block = struct.pack('<Q', len(pair) + 24) + pair + struct.pack('<Q', len(pair) + 24) + b'APK Sig Block 42'
    s4n = s4[:16] + struct.pack('<I', cd_off + len(block)) + s4[20:]; open(out, 'wb').write(s1 + block + s3 + s4n); return len(block)

def verify_v2(path, cert):
    data = open(path, 'rb').read(); e = data.rfind(b'PK\x05\x06'); cd_size, cd_off = struct.unpack('<II', data[e + 12:e + 20]); assert data[cd_off - 16:cd_off] == b'APK Sig Block 42', 'no signing block'
    size = struct.unpack('<Q', data[cd_off - 24:cd_off - 16])[0]; start = cd_off - size - 8; assert struct.unpack('<Q', data[start:start + 8])[0] == size
    pairs = data[start + 8:cd_off - 24]; ln, pid = struct.unpack('<QI', pairs[:12]); assert pid == 0x7109871a; v = pairs[12:8 + ln]
    sl = struct.unpack('<I', v[4:8])[0]; signer = v[8:8 + sl]; sdl = struct.unpack('<I', signer[:4])[0]; signed = signer[4:4 + sdl]
    rest = signer[4 + sdl:]; sgl = struct.unpack('<I', rest[:4])[0]; sigs = rest[4:4 + sgl]; one = sigs[4:]; algo, sl2 = struct.unpack('<II', one[:8]); sig = one[8:8 + sl2]
    cert.public_key().verify(sig, signed, padding.PKCS1v15(), hashes.SHA256())
    s1 = data[:start]; s3 = data[cd_off:cd_off + cd_size]; s4 = data[e:]; s4 = s4[:16] + struct.pack('<I', start) + s4[20:]
    want = chunks_digest([s1, s3, s4]); got = signed[16:48]; assert want == got, 'content digest mismatch'; return True

if __name__ == '__main__':
    base, www, out = sys.argv[1:4]; vcode = int(sys.argv[4]) if len(sys.argv) > 4 else 500; vname = sys.argv[5] if len(sys.argv) > 5 else '5.00'
    orient = UNSPECIFIED if len(sys.argv) > 6 and sys.argv[6] == 'any' else SENSOR_LANDSCAPE
    key, cert = keypair(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'keys')); tmp = out + '.unsigned'
    kept, cnt = build_unsigned(base, www, tmp, vcode, vname, orient); blk = sign_v2(tmp, out, key, cert); os.remove(tmp)
    ok = verify_v2(out, cert); z = zipfile.ZipFile(out); assert z.testzip() is None
    print(f'wrapper entries kept: {len(kept)} | www files: {cnt} | signing block {blk} B | v2 self-check: {ok} | size {os.path.getsize(out) / 1e6:.2f} MB')
    print('manifest versionCode/versionName ->', vcode, vname, '| screenOrientation ->', 'sensorLandscape' if orient == SENSOR_LANDSCAPE else 'unspecified')

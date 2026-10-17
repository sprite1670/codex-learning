#!/usr/bin/env python3
"""Build a signed, sideloadable APK with Android SDK 35 and a JDK (no Gradle)."""
import argparse
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--sdk-root', type=Path, required=True)
parser.add_argument('--keystore', type=Path, required=True,
                    help='Development signing key outside the repository; created if absent')
args = parser.parse_args()
sdk = args.sdk_root.resolve()
bt = sdk / 'build-tools' / '35.0.0'
if not bt.exists():
    bt = sdk / 'android-15'  # Google's standalone Build Tools 35 archive directory
platform = sdk / 'platforms' / 'android-35' / 'android.jar'
if not platform.exists():
    platform = sdk / 'android-35' / 'android.jar'
for prerequisite in [bt / 'aapt2', bt / 'lib' / 'd8.jar', platform]:
    if not prerequisite.is_file():
        raise SystemExit(f'Missing Android SDK component: {prerequisite}')


def run(*command):
    subprocess.run([str(part) for part in command], check=True)


build = ROOT / 'build'
build.mkdir(exist_ok=True)
classes = build / 'classes'
if classes.exists():
    shutil.rmtree(classes)  # Only this script's disposable compiled classes.
classes.mkdir()
dex = build / 'dex'
dex.mkdir(exist_ok=True)
generated = build / 'generated'
generated.mkdir(exist_ok=True)
source = ROOT / 'app' / 'src' / 'main'
resources = build / 'resources.zip'
unsigned = build / 'unsigned.apk'
aligned = build / 'aligned.apk'
out = ROOT.parent / 'dist'
out.mkdir(exist_ok=True)
apk = out / 'household-lottery-1.0.apk'

run(bt / 'aapt2', 'compile', '--dir', source / 'res', '-o', resources)
run(bt / 'aapt2', 'link', '-o', unsigned, '-I', platform,
    '--manifest', source / 'AndroidManifest.xml', '--java', generated,
    '-A', source / 'assets', resources)
sources = sorted((source / 'java').rglob('*.java')) + sorted(generated.rglob('*.java'))
run('java', 'com.sun.tools.javac.Main', '-encoding', 'UTF-8', '-source', '8',
    '-target', '8', '-bootclasspath',
    str(platform) + os.pathsep + str(bt / 'core-lambda-stubs.jar'),
    '-d', classes, *sources)
run('java', '-cp', bt / 'lib' / 'd8.jar', 'com.android.tools.r8.D8',
    '--release', '--min-api', '26', '--lib', platform,
    '--output', dex, *sorted(classes.rglob('*.class')))
with zipfile.ZipFile(unsigned, 'a', zipfile.ZIP_DEFLATED) as archive:
    archive.write(dex / 'classes.dex', 'classes.dex')
run(bt / 'zipalign', '-f', '-P', '16', '4', unsigned, aligned)

# Standard development key: suitable for personal testing, not store publication.
keystore = args.keystore.resolve()
if not keystore.exists():
    keystore.parent.mkdir(parents=True, exist_ok=True)
    run('keytool', '-genkeypair', '-keystore', keystore, '-alias', 'androiddebugkey',
        '-storepass', 'android', '-keypass', 'android', '-keyalg', 'RSA',
        '-keysize', '3072', '-validity', '10000', '-dname',
        'CN=Android Debug,O=Android,C=US', '-storetype', 'PKCS12')
    keystore.chmod(0o600)
run('java', '-jar', bt / 'lib' / 'apksigner.jar', 'sign', '--ks', keystore,
    '--ks-key-alias', 'androiddebugkey', '--ks-pass', 'pass:android',
    '--key-pass', 'pass:android', '--out', apk, aligned)
run('java', '-jar', bt / 'lib' / 'apksigner.jar', 'verify', '--verbose', apk)
run(bt / 'zipalign', '-c', '-P', '16', '4', apk)
digest = hashlib.sha256(apk.read_bytes()).hexdigest()
(out / (apk.name + '.sha256')).write_text(f'{digest}  {apk.name}\n')
print(f'Built: {apk}\nSize: {apk.stat().st_size} bytes\nSHA-256: {digest}')

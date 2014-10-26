#!/bin/bash

rm -r dist; mkdir -p dist
cp -r LICENSE README.md css html img js manifest.json dist/
cd dist
# Minify the JS files
for file in js/*.js; do
	java -jar ../yuicompressor-2.4.8.jar $file -o $file
done
# Minfiy CSS files
for file in css/*.css; do
	java -jar ../yuicompressor-2.4.8.jar $file -o $file
done

# Create a zip file
zip ../dist-ytsmartt LICENSE README.md css/ html/ img/ js/ manifest.json 

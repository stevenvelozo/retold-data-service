#! /bin/bash
echo "Example - Database Build Script"
echo "Contact: Steven Velozo <steven@velozo.com>"
echo ""
echo "---"
echo ""

echo "--> Stricture now generates everything automatically"
echo "--> It loads from ./Model.ddl if no parameters are passed"
npx stricture

echo "--> Database Code generation and compilation complete!"

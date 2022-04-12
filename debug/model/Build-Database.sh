#! /bin/bash
echo "Example - Database Build Script"
echo "Contact: Steven Velozo <steven@velozo.com>"
echo ""
echo "---"
echo ""

echo "--> Generating JSON model from DDL (with the BookStore prefix)"
npx stricture -i ./ddl/Model.ddl -c Compile -f ./ -o Model

echo "--> Generating MySQL Create Statements"
npx stricture -i ./Model-Extended.json -c MySQL -f ./mysql/ -o "Model-CreateDatabase"

echo "--> Generating Meadow Schemas"
npx stricture -i ./Model-Extended.json -c Meadow -f ./meadow/ -o "Model-MeadowSchema-"

echo "--> Generating Documentation"
npx stricture -i ./Model-Extended.json -c Documentation -g -f ./generated_documentation/
npx stricture -i ./Model-Extended.json -c Relationships -g -f ./generated_documentation/diagrams/
npx stricture -i ./Model-Extended.json -c RelationshipsFull -g -f ./generated_documentation/diagrams/full/

echo "--> Database Code generation and compilation complete!"

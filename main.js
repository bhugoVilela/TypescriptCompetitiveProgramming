import { ArgumentParser } from 'argparse'

const parser = new ArgumentParser("Compile a typescript program and print the type of the typealias 'Result'")

parser.add_argument('file', { 
    nargs: '?',
    help: 'The file to run',
    default: './solution.ts'
  })
parser.add_argument('--compiler', { 
  nargs: '?',
  help: 'path to compiler repo', 
  default: './UnboundedTypeScript'
})

const args = parser.parse_args()

const { default: ts } = await import(`${args["compiler"]}/built/local/typescript.js`)
const filePath = args.file

const program = ts.createProgram([filePath], { strict: true });
const checker = program.getTypeChecker();
const sourceFile = program.getSourceFile(filePath);

if (!sourceFile) {
  console.error(`Could not load source file: ${filePath}`);
  process.exit(1);
}

let found = false

function visit(node) {
  if (ts.isTypeAliasDeclaration(node) && node.name.text === "Result") {
    const type = checker.getTypeAtLocation(node);

    const typeString = checker.typeToString(
      type,
      undefined,
      ts.TypeFormatFlags.NoTruncation | // this flag ensures the types are printed fully
        ts.TypeFormatFlags.InTypeAlias, // this flag prints the type inside of the typealias instead of just printing its name
    );

    found = true
    console.log(typeString);
  } else {
    ts.forEachChild(node, visit);
  }
}

visit(sourceFile);
 
if (!found) {
  console.error("Result typealias was not found in source file")
}

package signature

import (
	"go/ast"
	"go/parser"
	"go/token"
	"log"
)

// StructSignatureHarvester extracts struct signatures from Go source files.
type StructSignatureHarvester struct{}

// ExtractStructSignatures parses a Go file and returns a slice of struct signatures.
func (h *StructSignatureHarvester) ExtractStructSignatures(filePath string) ([]string, error) {
	fileSet := token.NewFileSet()
	astFile, err := parser.ParseFile(fileSet, filePath, nil, 0)
	if err != nil {
		return nil, err
	}

	var structSignatures []string

	h.extractStructSignaturesFromAST(astFile, &structSignatures)

	return structSignatures, nil
}

// extractStructSignaturesFromAST recursively traverses the AST and extracts struct signatures.
func (h *StructSignatureHarvester) extractStructSignaturesFromAST(node ast.Node, structSignatures *[]string) {
	switch n := node.(type) {
	case *ast.StructType:
		structName := n.Name.String()
		if structName != "" {
			*structSignatures = append(*structSignatures, structName)
		}
	case *ast.TypeSpec:
		if t, ok := n.Type.(*ast.StructType); ok {
			h.extractStructSignaturesFromAST(t, structSignatures)
		}
	case *ast.FuncDecl:
		if f, ok := n.Type.(*ast.FuncType); ok && f.Params != nil {
			for _, param := range f.Params.List {
				if p, ok := param.Type.(*ast.StructType); ok {
					h.extractStructSignaturesFromAST(p, structSignatures)
				}
			}
		}
	case *ast.InterfaceType:
		for _, method := range n.Methods.List {
			if m, ok := method.Type.(*ast.FuncType); ok && m.Params != nil {
				for _, param := range m.Params.List {
					if p, ok := param.Type.(*ast.StructType); ok {
						h.extractStructSignaturesFromAST(p, structSignatures)
					}
				}
			}
		}
	case *ast.InterfaceSpec:
		if i, ok := n.Type.(*ast.InterfaceType); ok && i.Methods != nil {
			for _, method := range i.Methods.List {
				if m, ok := method.Type.(*ast.FuncType); ok && m.Params != nil {
					for _, param := range m.Params.List {
						if p, ok := param.Type.(*ast.StructType); ok {
							h.extractStructSignaturesFromAST(p, structSignatures)
						}
					}
				}
			}
		}
	case *ast.GenDecl:
		switch gen := n.(type) {
		case *ast.ImportSpec:
			if g, ok := gen.Type.(*ast.InterfaceType); ok && g.Methods != nil {
				for _, method := range g.Methods.List {
					if m, ok := method.Type.(*ast.FuncType); ok && m.Params != nil {
						for _, param := range m.Params.List {
							if p, ok := param.Type.(*ast.StructType); ok {
								h.extractStructSignaturesFromAST(p, structSignatures)
							}
						}
					}
				}
			}
		case *ast.TypeSpec:
			if t, ok := gen.Type.(*ast.InterfaceType); ok && t.Methods != nil {
				for _, method := range t.Methods.List {
					if m, ok := method.Type.(*ast.FuncType); ok && m.Params != nil {
						for _, param := range m.Params.List {
							if p, ok := param.Type.(*ast.StructType); ok {
								h.extractStructSignaturesFromAST(p, structSignatures)
							}
						}
					}
				}
			}
		case *ast.FuncSpec:
			if f, ok := gen.Type.(*ast.FuncType); ok && f.Params != nil {
				for _, param := range f.Params.List {
					if p, ok := param.Type.(*ast.StructType); ok {
						h.extractStructSignaturesFromAST(p, structSignatures)
					}
				}
			}
		case *ast.ValueSpec:
			if v, ok := gen.Type.(*ast.InterfaceType); ok && v.Methods != nil {
				for _, method := range v.Methods.List {
					if m, ok := method.Type.(*ast.FuncType); ok && m.Params != nil {
						for _, param := range m.Params.List {
							if p, ok := param.Type.(*ast.StructType); ok {
								h.extractStructSignaturesFromAST(p, structSignatures)
							}
						}
					}
				}
			}
		}
	case *ast.AssignStmt:
		for _, lhs := range n.Lhs {
			if s, ok := lhs.(*ast.SelectorExpr); ok && s.Sel.Name == "StructSignatureHarvester" {
				h.extractStructSignaturesFromAST(n.Rhs[0], structSignatures)
			}
		}
	case *ast.CallExpr:
		if c, ok := n.Fun.(*ast.Ident); ok && c.Name == "ExtractStructSignatures" {
			h.extractStructSignaturesFromAST(n.Args[0], structSignatures)
		}
	}

	for _, child := range ast.Inspect(node) {
		h.extractStructSignaturesFromAST(child, structSignatures)
	}
}

// Unit tests for StructSignatureHarvester
func TestExtractStructSignatures(t *testing.T) {
	testCases := []struct {
		filePath string
		want     []string
	}{
		{"path/to/file.go", []string{"MyStruct", "AnotherStruct"}},
		{"another/path/to/file.go", []string{"YetAnotherStruct"}},
	}

	for _, tc := range testCases {
		got, err := ExtractStructSignatures(tc.filePath)
		if err != nil {
			t.Errorf("ExtractStructSignatures(%q) = error: %v", tc.filePath, err)
			continue
		}
		if !reflect.DeepEqual(got, tc.want) {
			t.Errorf("ExtractStructSignatures(%q) = %v; want %v", tc.filePath, got, tc.want)
		}
	}
}
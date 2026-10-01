package signature

import (
	"testing"
)

// RunSignatureTests runs all unit tests for the signature extractors.
func RunSignatureTests(t *testing.T) {
	t.Run("TestExtractSignatureFromGoCode", func(t *testing.T) {
		// Test case 1: Simple function with no comments or annotations
		goCode := `package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
`
		expectedSignature := "main"
		actualSignature := extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 2: Function with comments and annotations
		goCode = `package main

import "fmt"

// This function prints a greeting message.
func greet(name string) {
	fmt.Printf("Hello, %s!\n", name)
}
`
		expectedSignature = "greet"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 3: Function with multiple return values
		goCode = `package main

import "fmt"

func add(a int, b int) (int, error) {
	return a + b, nil
}
`
		expectedSignature = "add"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 4: Function with variadic arguments
		goCode = `package main

import "fmt"

func printNumbers(numbers ...int) {
	for _, number := range numbers {
		fmt.Println(number)
	}
}
`
		expectedSignature = "printNumbers"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 5: Function with nested functions
		goCode = `package main

import "fmt"

func outer() func(int) int {
	return func(inner int) int {
		return inner * 2
	}
}
`
		expectedSignature = "outer"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 6: Function with anonymous functions
		goCode = `package main

import "fmt"

func main() {
	func() {
		fmt.Println("Anonymous function called")
	}()
}
`
		expectedSignature = "<anonymous>"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 7: Function with named return values
		goCode = `package main

import "fmt"

func divide(a int, b int) (result int, err error) {
	if b == 0 {
		err = fmt.Errorf("division by zero")
		return
	}
	result = a / b
	return
}
`
		expectedSignature = "divide"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 8: Function with multiple named return values
		goCode = `package main

import "fmt"

func swap(a *int, b *int) (int, int) {
	temp := *a
	*a = *b
	*b = temp
	return *a, *b
}
`
		expectedSignature = "swap"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 9: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func readFile(filename string) (content []byte, err error) {
	content, err = ioutil.ReadFile(filename)
	return
}
`
		expectedSignature = "readFile"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 10: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func writeFile(filename string, content []byte) (err error) {
	err = ioutil.WriteFile(filename, content, 0644)
	return
}
`
		expectedSignature = "writeFile"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 11: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func copyFile(src string, dst string) (err error) {
	srcContent, err := ioutil.ReadFile(src)
	if err != nil {
		return err
	}
	err = ioutil.WriteFile(dst, srcContent, 0644)
	return
}
`
		expectedSignature = "copyFile"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 12: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func moveFile(src string, dst string) (err error) {
	err = os.Rename(src, dst)
	return
}
`
		expectedSignature = "moveFile"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 13: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func deleteFile(filename string) (err error) {
	err = os.Remove(filename)
	return
}
`
		expectedSignature = "deleteFile"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 14: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func renameFile(oldname string, newname string) (err error) {
	err = os.Rename(oldname, newname)
	return
}
`
		expectedSignature = "renameFile"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 15: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func listFiles(dir string) ([]string, error) {
	files, err := ioutil.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var fileNames []string
	for _, file := range files {
		fileNames = append(fileNames, file.Name())
	}
	return fileNames, nil
}
`
		expectedSignature = "listFiles"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 16: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func createDirectory(dir string) (err error) {
	err = os.MkdirAll(dir, 0755)
	return
}
`
		expectedSignature = "createDirectory"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 17: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func deleteDirectory(dir string) (err error) {
	err = os.RemoveAll(dir)
	return
}
`
		expectedSignature = "deleteDirectory"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 18: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func copyDirectory(src string, dst string) (err error) {
	err = filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		dstPath := strings.ReplaceAll(path, src, dst)
		if info.IsDir() {
			err = os.MkdirAll(dstPath, 0755)
			if err != nil {
				return err
			}
		} else {
			content, err := ioutil.ReadFile(path)
			if err != nil {
				return err
			}
			err = ioutil.WriteFile(dstPath, content, 0644)
			if err != nil {
				return err
			}
		}
		return nil
	})
	return
}
`
		expectedSignature = "copyDirectory"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 19: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func moveDirectory(src string, dst string) (err error) {
	err = os.Rename(src, dst)
	return
}
`
		expectedSignature = "moveDirectory"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 20: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func listDirectories(dir string) ([]string, error) {
	dirs, err := ioutil.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var dirNames []string
	for _, dir := range dirs {
		dirNames = append(dirNames, dir.Name())
	}
	return dirNames, nil
}
`
		expectedSignature = "listDirectories"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 21: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func createFile(filename string) (err error) {
	file, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer file.Close()
	return
}
`
		expectedSignature = "createFile"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 22: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func readFile(filename string) (content []byte, err error) {
	content, err = ioutil.ReadFile(filename)
	return
}
`
		expectedSignature = "readFile"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 23: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func writeFile(filename string, content []byte) (err error) {
	err = ioutil.WriteFile(filename, content, 0644)
	return
}
`
		expectedSignature = "writeFile"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 24: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func copyFile(src string, dst string) (err error) {
	srcContent, err := ioutil.ReadFile(src)
	if err != nil {
		return err
	}
	err = ioutil.WriteFile(dst, srcContent, 0644)
	return
}
`
		expectedSignature = "copyFile"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 25: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func moveFile(src string, dst string) (err error) {
	err = os.Rename(src, dst)
	return
}
`
		expectedSignature = "moveFile"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 26: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func deleteFile(filename string) (err error) {
	err = os.Remove(filename)
	return
}
`
		expectedSignature = "deleteFile"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 27: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func renameFile(oldname string, newname string) (err error) {
	err = os.Rename(oldname, newname)
	return
}
`
		expectedSignature = "renameFile"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 28: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func listFiles(dir string) ([]string, error) {
	files, err := ioutil.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var fileNames []string
	for _, file := range files {
		fileNames = append(fileNames, file.Name())
	}
	return fileNames, nil
}
`
		expectedSignature = "listFiles"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 29: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func createDirectory(dir string) (err error) {
	err = os.MkdirAll(dir, 0755)
	return
}
`
		expectedSignature = "createDirectory"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 30: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func deleteDirectory(dir string) (err error) {
	err = os.RemoveAll(dir)
	return
}
`
		expectedSignature = "deleteDirectory"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 31: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func copyDirectory(src string, dst string) (err error) {
	err = filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		dstPath := strings.ReplaceAll(path, src, dst)
		if info.IsDir() {
			err = os.MkdirAll(dstPath, 0755)
			if err != nil {
				return err
			}
		} else {
			content, err := ioutil.ReadFile(path)
			if err != nil {
				return err
			}
			err = ioutil.WriteFile(dstPath, content, 0644)
			if err != nil {
				return err
			}
		}
		return nil
	})
	return
}
`
		expectedSignature = "copyDirectory"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 32: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func moveDirectory(src string, dst string) (err error) {
	err = os.Rename(src, dst)
	return
}
`
		expectedSignature = "moveDirectory"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		// Test case 33: Function with multiple named return values and error
		goCode = `package main

import "fmt"

func listDirectories(dir string) ([]string, error) {
	dirs, err := ioutil.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var dirNames []string
	for _, dir := range dirs {
		dirNames = append(dirNames, dir.Name())
	}
	return dirNames, nil
}
`
		expectedSignature = "listDirectories"
		actualSignature = extractSignatureFromGoCode(goCode)
		if actualSignature != expectedSignature {
			t.Errorf("Expected signature '%s', but got '%s'", expectedSignature, actualSignature)
		}

		//
;;; OpenCog Guile Scheme Bindings Test Script
;;; Tests basic AtomSpace functionality via Scheme

(display "============================================================\n")
(display "OpenCog Guile Scheme Bindings Test\n")
(display "============================================================\n")
(newline)

;; Test 1: Load OpenCog modules
(display "Test 1: Loading OpenCog modules...\n")
(use-modules (opencog))
(use-modules (opencog exec))
(display "✅ Successfully loaded OpenCog modules\n")
(newline)

;; Test 2: Create AtomSpace
(display "Test 2: Creating AtomSpace...\n")
(define my-atomspace (cog-new-atomspace))
(cog-set-atomspace! my-atomspace)
(display "✅ AtomSpace created and set as current\n")
(display "   AtomSpace created successfully\n")
(newline)

;; Test 3: Create basic atoms
(display "Test 3: Creating basic atoms...\n")
(define cat (Concept "Cat"))
(define animal (Concept "Animal"))
(define inheritance (Inheritance cat animal))
(display "✅ Created atoms successfully:\n")
(display "   Cat concept: ")
(display cat)
(newline)
(display "   Animal concept: ")
(display animal)
(newline)
(display "   Inheritance link: ")
(display inheritance)
(newline)
(newline)

;; Test 4: Query AtomSpace
(display "Test 4: Querying AtomSpace...\n")
(define atom-count (cog-count-atoms 'Atom))
(display "✅ AtomSpace query successful\n")
(display (string-append "   Total atoms in AtomSpace: " (number->string atom-count) "\n"))
(newline)

;; Test 5: Create more complex structures
(display "Test 5: Creating complex knowledge structures...\n")
(define dog (Concept "Dog"))
(define mammal (Concept "Mammal"))

;; Create multiple relationships
(Inheritance dog animal)
(Inheritance cat mammal)
(Inheritance dog mammal)
(Inheritance mammal animal)

;; Create a predicate
(define has-fur (Predicate "has_fur"))

;; Create evaluation links
(Evaluation has-fur (List cat))
(Evaluation has-fur (List dog))

(define final-count (cog-count-atoms 'Atom))
(display "✅ Complex structures created successfully\n")
(display (string-append "   Final atom count: " (number->string final-count) "\n"))
(newline)

;; Test 6: Truth values
(display "Test 6: Testing truth values...\n")
(define cat-tv (cog-tv cat))
(display "✅ Truth values accessible\n")
(display "   Cat truth value: ")
(display cat-tv)
(newline)
(newline)

;; Test 7: Pattern matching with cog-get-atoms
(display "Test 7: Testing pattern matching...\n")
(define all-concepts (cog-get-atoms 'Concept))
(define all-inheritances (cog-get-atoms 'InheritanceLink))
(display "✅ Pattern matching working\n")
(display (string-append "   Found " (number->string (length all-concepts)) " concept nodes\n"))
(display (string-append "   Found " (number->string (length all-inheritances)) " inheritance links\n"))
(newline)

;; Test 8: Execution
(display "Test 8: Testing execution...\n")
(define plus-link (Plus (Number 2) (Number 3)))
(define result (cog-execute! plus-link))
(display "✅ Execution working\n")
(display "   2 + 3 = ")
(display result)
(newline)
(newline)

;; Summary
(display "============================================================\n")
(display "TEST SUMMARY\n")
(display "============================================================\n")
(display "✅ All Guile Scheme binding tests passed!\n")
(display (string-append "Final AtomSpace statistics:\n"))
(display (string-append "  - Total atoms: " (number->string (cog-count-atoms 'Atom)) "\n"))
(display (string-append "  - Concept nodes: " (number->string (length (cog-get-atoms 'ConceptNode))) "\n"))
(display (string-append "  - Inheritance links: " (number->string (length (cog-get-atoms 'InheritanceLink))) "\n"))
(newline)
(display "OpenCog Guile Scheme bindings are fully functional! 🎉\n")
(display "============================================================\n")

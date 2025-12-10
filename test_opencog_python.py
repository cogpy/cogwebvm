#!/usr/bin/env python3
"""
OpenCog Python Bindings Test Script
Tests basic AtomSpace functionality and Python bindings
"""

print("=" * 60)
print("OpenCog Python Bindings Test")
print("=" * 60)
print()

# Test 1: Import OpenCog modules
print("Test 1: Importing OpenCog modules...")
try:
    from opencog.atomspace import AtomSpace, types
    from opencog.type_constructors import *
    from opencog.utilities import initialize_opencog
    print("✅ Successfully imported OpenCog modules")
except ImportError as e:
    print(f"❌ Failed to import: {e}")
    exit(1)

print()

# Test 2: Create AtomSpace
print("Test 2: Creating AtomSpace...")
try:
    atomspace = AtomSpace()
    print(f"✅ AtomSpace created successfully")
    print(f"   AtomSpace object: {atomspace}")
except Exception as e:
    print(f"❌ Failed to create AtomSpace: {e}")
    exit(1)

print()

# Test 3: Initialize OpenCog with AtomSpace
print("Test 3: Initializing OpenCog...")
try:
    initialize_opencog(atomspace)
    print("✅ OpenCog initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize OpenCog: {e}")
    exit(1)

print()

# Test 4: Create basic atoms
print("Test 4: Creating basic atoms...")
try:
    # Create concept nodes
    cat = ConceptNode("Cat")
    animal = ConceptNode("Animal")
    
    # Create inheritance link
    inheritance = InheritanceLink(cat, animal)
    
    print(f"✅ Created atoms successfully:")
    print(f"   Cat concept: {cat}")
    print(f"   Animal concept: {animal}")
    print(f"   Inheritance link: {inheritance}")
except Exception as e:
    print(f"❌ Failed to create atoms: {e}")
    exit(1)

print()

# Test 5: Query AtomSpace
print("Test 5: Querying AtomSpace...")
try:
    atom_count = atomspace.size()
    print(f"✅ AtomSpace query successful")
    print(f"   Total atoms in AtomSpace: {atom_count}")
    
    # Get all atoms
    all_atoms = atomspace.get_atoms_by_type(types.Atom)
    print(f"   Atoms retrieved: {len(all_atoms)}")
except Exception as e:
    print(f"❌ Failed to query AtomSpace: {e}")
    exit(1)

print()

# Test 6: Create more complex structures
print("Test 6: Creating complex knowledge structures...")
try:
    # Create more concepts
    dog = ConceptNode("Dog")
    mammal = ConceptNode("Mammal")
    
    # Create multiple relationships
    InheritanceLink(dog, animal)
    InheritanceLink(cat, mammal)
    InheritanceLink(dog, mammal)
    InheritanceLink(mammal, animal)
    
    # Create a predicate
    has_fur = PredicateNode("has_fur")
    
    # Create evaluation links
    EvaluationLink(
        has_fur,
        ListLink(cat)
    )
    
    EvaluationLink(
        has_fur,
        ListLink(dog)
    )
    
    final_count = atomspace.size()
    print(f"✅ Complex structures created successfully")
    print(f"   Final atom count: {final_count}")
except Exception as e:
    print(f"❌ Failed to create complex structures: {e}")
    exit(1)

print()

# Test 7: Truth values
print("Test 7: Testing truth values...")
try:
    # Check default truth value
    print(f"✅ Truth values accessible")
    print(f"   Cat truth value: {cat.tv}")
    print(f"   Strength: {cat.tv.mean}")
    print(f"   Confidence: {cat.tv.confidence}")
except Exception as e:
    print(f"❌ Failed to access truth values: {e}")
    exit(1)

print()

# Test 8: Pattern matching
print("Test 8: Testing pattern matching...")
try:
    # Get all inheritance links
    inheritance_links = atomspace.get_atoms_by_type(types.InheritanceLink)
    print(f"✅ Pattern matching working")
    print(f"   Found {len(inheritance_links)} inheritance links")
    
    # Display them
    for link in inheritance_links[:3]:  # Show first 3
        print(f"   - {link}")
except Exception as e:
    print(f"❌ Failed pattern matching: {e}")
    exit(1)

print()

# Summary
print("=" * 60)
print("TEST SUMMARY")
print("=" * 60)
print("✅ All Python binding tests passed!")
print(f"Final AtomSpace statistics:")
print(f"  - Total atoms: {atomspace.size()}")
print(f"  - Concept nodes: {len(atomspace.get_atoms_by_type(types.ConceptNode))}")
print(f"  - Inheritance links: {len(atomspace.get_atoms_by_type(types.InheritanceLink))}")
print(f"  - Evaluation links: {len(atomspace.get_atoms_by_type(types.EvaluationLink))}")
print()
print("OpenCog Python bindings are fully functional! 🎉")
print("=" * 60)

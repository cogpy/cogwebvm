// test/test_all.cpp — Minimal C++11 test suite for cogwebvm headers
// Tests core types and webvm (S-expression parser, REPL, JSON) modules.
// SPDX-License-Identifier: MIT

#include <cog/cog.hpp>
#include <iostream>
#include <cassert>
#include <sstream>

// ─────────────────────────────────────────────────────────────────────────────
// Simple test framework
// ─────────────────────────────────────────────────────────────────────────────
static int tests_run = 0;
static int tests_passed = 0;

#define TEST(name)                                                        \
    do {                                                                  \
        ++tests_run;                                                      \
        std::cout << "  [" << tests_run << "] " << #name << "... ";       \
        try {                                                             \
            test_##name();                                                \
            ++tests_passed;                                               \
            std::cout << "PASS" << std::endl;                             \
        } catch (const std::exception& e) {                               \
            std::cout << "FAIL: " << e.what() << std::endl;               \
        } catch (...) {                                                   \
            std::cout << "FAIL: unknown exception" << std::endl;          \
        }                                                                 \
    } while (0)

#define ASSERT_TRUE(cond) \
    if (!(cond)) throw std::runtime_error("assertion failed: " #cond)

#define ASSERT_EQ(a, b) \
    if ((a) != (b)) { \
        std::ostringstream ss; \
        ss << "expected " << (a) << " == " << (b); \
        throw std::runtime_error(ss.str()); \
    }

// ─────────────────────────────────────────────────────────────────────────────
// Core module tests
// ─────────────────────────────────────────────────────────────────────────────

void test_handle_creation() {
    cog::Handle h1 = 1;
    cog::Handle h2 = 2;
    ASSERT_TRUE(h1 != h2);
    ASSERT_TRUE(cog::UNDEFINED_HANDLE == 0);
}

void test_atomspace_add_node() {
    cog::AtomSpace as;
    auto h = as.add_node(cog::AtomType::CONCEPT_NODE, "hello");
    ASSERT_TRUE(h != cog::UNDEFINED_HANDLE);
    auto* atom = as.get_atom(h);
    ASSERT_TRUE(atom != nullptr);
    ASSERT_EQ(atom->name, std::string("hello"));
}

void test_atomspace_add_link() {
    cog::AtomSpace as;
    auto h1 = as.add_node(cog::AtomType::CONCEPT_NODE, "A");
    auto h2 = as.add_node(cog::AtomType::CONCEPT_NODE, "B");
    auto link = as.add_link(cog::AtomType::INHERITANCE_LINK, {h1, h2});
    ASSERT_TRUE(link != cog::UNDEFINED_HANDLE);
}

// ─────────────────────────────────────────────────────────────────────────────
// WebVM module tests — S-expression parser
// ─────────────────────────────────────────────────────────────────────────────

void test_parser_atom() {
    auto expr = cog::webvm::Parser::parse("hello");
    ASSERT_TRUE(expr != nullptr);
    ASSERT_TRUE(expr->type == cog::webvm::SExpr::ATOM);
    ASSERT_EQ(expr->atom_val, std::string("hello"));
}

void test_parser_number() {
    auto expr = cog::webvm::Parser::parse("42");
    ASSERT_TRUE(expr != nullptr);
    ASSERT_TRUE(expr->type == cog::webvm::SExpr::NUMBER);
    ASSERT_TRUE(expr->num_val > 41.9 && expr->num_val < 42.1);
}

void test_parser_list() {
    auto expr = cog::webvm::Parser::parse("(ConceptNode \"test\")");
    ASSERT_TRUE(expr != nullptr);
    ASSERT_TRUE(expr->type == cog::webvm::SExpr::LIST);
    ASSERT_TRUE(expr->children.size() >= 1);
}

void test_parser_nested() {
    auto expr = cog::webvm::Parser::parse("(Evaluation (PredicateNode \"is\") (ListLink (ConceptNode \"A\")))");
    ASSERT_TRUE(expr != nullptr);
    ASSERT_TRUE(expr->type == cog::webvm::SExpr::LIST);
}

// ─────────────────────────────────────────────────────────────────────────────
// WebVM module tests — REPL
// ─────────────────────────────────────────────────────────────────────────────

void test_repl_concept_node() {
    cog::AtomSpace as;
    cog::webvm::REPL repl(as);
    std::string result = repl.eval("(ConceptNode \"test-node\")");
    ASSERT_TRUE(!result.empty());
}

// ─────────────────────────────────────────────────────────────────────────────
// WebVM module tests — JSON serialization
// ─────────────────────────────────────────────────────────────────────────────

void test_json_serialize_empty() {
    cog::AtomSpace as;
    cog::webvm::JSONSerializer json(as);
    std::string out = json.serialize();
    // Should contain valid JSON with empty atoms array
    ASSERT_TRUE(out.find("\"atoms\"") != std::string::npos);
    ASSERT_TRUE(out.find("\"size\":0") != std::string::npos);
}

void test_json_serialize_with_atoms() {
    cog::AtomSpace as;
    as.add_node(cog::AtomType::CONCEPT_NODE, "foo");
    as.add_node(cog::AtomType::CONCEPT_NODE, "bar");
    cog::webvm::JSONSerializer json(as);
    std::string out = json.serialize();
    ASSERT_TRUE(out.find("\"size\":2") != std::string::npos);
    ASSERT_TRUE(out.find("foo") != std::string::npos);
    ASSERT_TRUE(out.find("bar") != std::string::npos);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

int main() {
    std::cout << "cogwebvm C++ test suite" << std::endl;
    std::cout << "=======================" << std::endl;

    std::cout << "\n--- Core Module ---" << std::endl;
    TEST(handle_creation);
    TEST(atomspace_add_node);
    TEST(atomspace_add_link);

    std::cout << "\n--- WebVM Module (Parser) ---" << std::endl;
    TEST(parser_atom);
    TEST(parser_number);
    TEST(parser_list);
    TEST(parser_nested);

    std::cout << "\n--- WebVM Module (REPL) ---" << std::endl;
    TEST(repl_concept_node);

    std::cout << "\n--- WebVM Module (JSON) ---" << std::endl;
    TEST(json_serialize_empty);
    TEST(json_serialize_with_atoms);

    std::cout << "\n=======================" << std::endl;
    std::cout << tests_passed << "/" << tests_run << " tests passed" << std::endl;

    return (tests_passed == tests_run) ? 0 : 1;
}

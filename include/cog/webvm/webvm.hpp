// cog/webvm/webvm.hpp — Web AtomSpace Virtual Machine
// S-expression parser, Scheme REPL, JSON serialization, thread-safe AtomSpace
// Header-only, C++11, zero external dependencies
// SPDX-License-Identifier: MIT
#ifndef COG_WEBVM_HPP
#define COG_WEBVM_HPP

#include "../core/core.hpp"
#include <cstdint>
#include <string>
#include <vector>
#include <unordered_map>
#include <memory>
#include <functional>
#include <sstream>
#include <algorithm>
#include <cassert>
#include <cctype>

namespace cog { namespace webvm {

// ─────────────────────────────────────────────────────────────────────────────
// S-Expression AST
// ─────────────────────────────────────────────────────────────────────────────
struct SExpr {
    enum Type { ATOM, STRING, NUMBER, LIST, NIL };
    Type type;
    std::string atom_val;
    double num_val;
    std::vector<std::shared_ptr<SExpr>> children;

    SExpr() : type(NIL), num_val(0) {}

    static std::shared_ptr<SExpr> make_atom(const std::string& s) {
        auto e = std::make_shared<SExpr>();
        e->type = ATOM;
        e->atom_val = s;
        return e;
    }

    static std::shared_ptr<SExpr> make_string(const std::string& s) {
        auto e = std::make_shared<SExpr>();
        e->type = STRING;
        e->atom_val = s;
        return e;
    }

    static std::shared_ptr<SExpr> make_number(double v) {
        auto e = std::make_shared<SExpr>();
        e->type = NUMBER;
        e->num_val = v;
        return e;
    }

    static std::shared_ptr<SExpr> make_list() {
        auto e = std::make_shared<SExpr>();
        e->type = LIST;
        return e;
    }

    static std::shared_ptr<SExpr> make_nil() {
        return std::make_shared<SExpr>();
    }

    std::string to_string() const {
        switch (type) {
            case ATOM:   return atom_val;
            case STRING: return "\"" + atom_val + "\"";
            case NUMBER: {
                std::ostringstream os;
                os << num_val;
                return os.str();
            }
            case LIST: {
                std::string s = "(";
                for (size_t i = 0; i < children.size(); ++i) {
                    if (i > 0) s += " ";
                    s += children[i]->to_string();
                }
                s += ")";
                return s;
            }
            case NIL: return "()";
        }
        return "";
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Parser — S-expression parser
// ─────────────────────────────────────────────────────────────────────────────
class Parser {
public:
    // Parse a string into an S-expression
    static std::shared_ptr<SExpr> parse(const std::string& input) {
        size_t pos = 0;
        return parse_expr(input, pos);
    }

    // Parse multiple expressions
    static std::vector<std::shared_ptr<SExpr>> parse_all(const std::string& input) {
        std::vector<std::shared_ptr<SExpr>> result;
        size_t pos = 0;
        while (pos < input.size()) {
            skip_whitespace(input, pos);
            if (pos >= input.size()) break;
            // Skip comments
            if (input[pos] == ';') {
                while (pos < input.size() && input[pos] != '\n') ++pos;
                continue;
            }
            auto expr = parse_expr(input, pos);
            if (expr) result.push_back(expr);
        }
        return result;
    }

private:
    static void skip_whitespace(const std::string& s, size_t& pos) {
        while (pos < s.size() && std::isspace(static_cast<unsigned char>(s[pos]))) ++pos;
    }

    static std::shared_ptr<SExpr> parse_expr(const std::string& s, size_t& pos) {
        skip_whitespace(s, pos);
        if (pos >= s.size()) return SExpr::make_nil();

        char c = s[pos];

        // List
        if (c == '(') {
            ++pos;
            auto list = SExpr::make_list();
            while (pos < s.size()) {
                skip_whitespace(s, pos);
                if (pos >= s.size() || s[pos] == ')') { ++pos; break; }
                auto child = parse_expr(s, pos);
                if (child) list->children.push_back(child);
            }
            return list;
        }

        // String literal
        if (c == '"') {
            ++pos;
            std::string str;
            while (pos < s.size() && s[pos] != '"') {
                if (s[pos] == '\\' && pos + 1 < s.size()) {
                    ++pos;
                    switch (s[pos]) {
                        case 'n': str += '\n'; break;
                        case 't': str += '\t'; break;
                        case '"': str += '"'; break;
                        case '\\': str += '\\'; break;
                        default: str += s[pos]; break;
                    }
                } else {
                    str += s[pos];
                }
                ++pos;
            }
            if (pos < s.size()) ++pos; // skip closing "
            return SExpr::make_string(str);
        }

        // Quote shorthand
        if (c == '\'') {
            ++pos;
            auto list = SExpr::make_list();
            list->children.push_back(SExpr::make_atom("quote"));
            auto quoted = parse_expr(s, pos);
            if (quoted) list->children.push_back(quoted);
            return list;
        }

        // Atom or number
        std::string token;
        while (pos < s.size() && !std::isspace(static_cast<unsigned char>(s[pos]))
               && s[pos] != '(' && s[pos] != ')') {
            token += s[pos++];
        }

        if (token.empty()) return SExpr::make_nil();

        // Try to parse as number
        bool is_num = true;
        bool has_dot = false;
        for (size_t i = 0; i < token.size(); ++i) {
            char tc = token[i];
            if (tc == '-' && i == 0) continue;
            if (tc == '.' && !has_dot) { has_dot = true; continue; }
            if (!std::isdigit(static_cast<unsigned char>(tc))) { is_num = false; break; }
        }

        if (is_num && !token.empty() && token != "-" && token != ".") {
            double val = 0;
            std::istringstream iss(token);
            iss >> val;
            return SExpr::make_number(val);
        }

        return SExpr::make_atom(token);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// REPL — Scheme-like REPL for AtomSpace manipulation
// ─────────────────────────────────────────────────────────────────────────────
class REPL {
public:
    explicit REPL(AtomSpace& as) : as_(as) {
        // Register built-in commands
        register_builtins();
    }

    // Evaluate a string, return result as string
    std::string eval(const std::string& input) {
        auto exprs = Parser::parse_all(input);
        std::string result;
        for (auto& expr : exprs) {
            auto res = eval_expr(expr);
            if (res) {
                if (!result.empty()) result += "\n";
                result += res->to_string();
            }
        }
        return result;
    }

    // Register a custom command
    using CommandFn = std::function<std::shared_ptr<SExpr>(const std::vector<std::shared_ptr<SExpr>>&)>;
    void register_command(const std::string& name, CommandFn fn) {
        commands_[name] = fn;
    }

private:
    AtomSpace& as_;
    std::unordered_map<std::string, CommandFn> commands_;
    std::unordered_map<std::string, std::shared_ptr<SExpr>> env_;

    void register_builtins() {
        // (cog-new-node 'ConceptNode "name")
        commands_["cog-new-node"] = [this](const std::vector<std::shared_ptr<SExpr>>& args)
            -> std::shared_ptr<SExpr> {
            if (args.size() < 2) return SExpr::make_atom("#<error: need type and name>");
            std::string type_name = resolve_atom(args[0]);
            std::string name = resolve_string(args[1]);
            AtomType type = parse_atom_type(type_name);
            Handle h = as_.add_node(type, name);
            return SExpr::make_atom("#<atom:" + std::to_string(h) + ">");
        };

        // (cog-new-link 'InheritanceLink atom1 atom2)
        commands_["cog-new-link"] = [this](const std::vector<std::shared_ptr<SExpr>>& args)
            -> std::shared_ptr<SExpr> {
            if (args.size() < 2) return SExpr::make_atom("#<error: need type and atoms>");
            std::string type_name = resolve_atom(args[0]);
            AtomType type = parse_atom_type(type_name);
            std::vector<Handle> outgoing;
            for (size_t i = 1; i < args.size(); ++i) {
                Handle h = resolve_handle(args[i]);
                if (h != UNDEFINED_HANDLE) outgoing.push_back(h);
            }
            Handle h = as_.add_link(type, outgoing);
            return SExpr::make_atom("#<link:" + std::to_string(h) + ">");
        };

        // (cog-node 'ConceptNode "name")
        commands_["cog-node"] = [this](const std::vector<std::shared_ptr<SExpr>>& args)
            -> std::shared_ptr<SExpr> {
            if (args.size() < 2) return SExpr::make_nil();
            std::string type_name = resolve_atom(args[0]);
            std::string name = resolve_string(args[1]);
            AtomType type = parse_atom_type(type_name);
            auto handles = as_.get_by_type(type);
            for (auto h : handles) {
                const Atom* a = as_.get_atom(h);
                if (a && a->name == name) {
                    return atom_to_sexpr(h);
                }
            }
            return SExpr::make_nil();
        };

        // (cog-get-atoms 'ConceptNode)
        commands_["cog-get-atoms"] = [this](const std::vector<std::shared_ptr<SExpr>>& args)
            -> std::shared_ptr<SExpr> {
            if (args.empty()) return SExpr::make_nil();
            std::string type_name = resolve_atom(args[0]);
            AtomType type = parse_atom_type(type_name);
            auto handles = as_.get_by_type(type);
            auto list = SExpr::make_list();
            for (auto h : handles) {
                list->children.push_back(atom_to_sexpr(h));
            }
            return list;
        };

        // (cog-incoming-set atom)
        commands_["cog-incoming-set"] = [this](const std::vector<std::shared_ptr<SExpr>>& args)
            -> std::shared_ptr<SExpr> {
            if (args.empty()) return SExpr::make_nil();
            Handle h = resolve_handle(args[0]);
            auto incoming = as_.get_incoming(h);
            auto list = SExpr::make_list();
            for (auto ih : incoming) {
                list->children.push_back(atom_to_sexpr(ih));
            }
            return list;
        };

        // (cog-atomspace-size)
        commands_["cog-atomspace-size"] = [this](const std::vector<std::shared_ptr<SExpr>>&)
            -> std::shared_ptr<SExpr> {
            return SExpr::make_number(static_cast<double>(as_.size()));
        };

        // (cog-atomspace-clear)
        commands_["cog-atomspace-clear"] = [this](const std::vector<std::shared_ptr<SExpr>>&)
            -> std::shared_ptr<SExpr> {
            as_.clear();
            return SExpr::make_atom("#t");
        };

        // (define name value)
        commands_["define"] = [this](const std::vector<std::shared_ptr<SExpr>>& args)
            -> std::shared_ptr<SExpr> {
            if (args.size() < 2) return SExpr::make_atom("#<error: need name and value>");
            std::string name = resolve_atom(args[0]);
            auto val = eval_expr(args[1]);
            env_[name] = val;
            return val;
        };

        // (display expr)
        commands_["display"] = [this](const std::vector<std::shared_ptr<SExpr>>& args)
            -> std::shared_ptr<SExpr> {
            if (args.empty()) return SExpr::make_nil();
            return args[0];
        };

        // Arithmetic: +, -, *, /
        commands_["+"] = [](const std::vector<std::shared_ptr<SExpr>>& args) -> std::shared_ptr<SExpr> {
            double sum = 0;
            for (auto& a : args) if (a->type == SExpr::NUMBER) sum += a->num_val;
            return SExpr::make_number(sum);
        };
        commands_["-"] = [](const std::vector<std::shared_ptr<SExpr>>& args) -> std::shared_ptr<SExpr> {
            if (args.empty()) return SExpr::make_number(0);
            double val = args[0]->type == SExpr::NUMBER ? args[0]->num_val : 0;
            for (size_t i = 1; i < args.size(); ++i)
                if (args[i]->type == SExpr::NUMBER) val -= args[i]->num_val;
            return SExpr::make_number(val);
        };
        commands_["*"] = [](const std::vector<std::shared_ptr<SExpr>>& args) -> std::shared_ptr<SExpr> {
            double prod = 1;
            for (auto& a : args) if (a->type == SExpr::NUMBER) prod *= a->num_val;
            return SExpr::make_number(prod);
        };
    }

    std::shared_ptr<SExpr> eval_expr(std::shared_ptr<SExpr> expr) {
        if (!expr) return SExpr::make_nil();

        switch (expr->type) {
            case SExpr::NUMBER:
            case SExpr::STRING:
            case SExpr::NIL:
                return expr;

            case SExpr::ATOM: {
                // Check environment
                auto it = env_.find(expr->atom_val);
                if (it != env_.end()) return it->second;
                return expr;
            }

            case SExpr::LIST: {
                if (expr->children.empty()) return SExpr::make_nil();

                // Get command name
                auto head = expr->children[0];
                std::string cmd_name;
                if (head->type == SExpr::ATOM) cmd_name = head->atom_val;

                // Special forms
                if (cmd_name == "quote" && expr->children.size() > 1) {
                    return expr->children[1];
                }

                if (cmd_name == "if" && expr->children.size() >= 3) {
                    auto cond = eval_expr(expr->children[1]);
                    bool truthy = cond && cond->type != SExpr::NIL &&
                                  !(cond->type == SExpr::ATOM && cond->atom_val == "#f");
                    if (truthy) return eval_expr(expr->children[2]);
                    if (expr->children.size() > 3) return eval_expr(expr->children[3]);
                    return SExpr::make_nil();
                }

                // Look up command
                auto it = commands_.find(cmd_name);
                if (it != commands_.end()) {
                    // Evaluate arguments (except for define, quote)
                    std::vector<std::shared_ptr<SExpr>> args;
                    bool eval_args = (cmd_name != "define" && cmd_name != "quote");
                    for (size_t i = 1; i < expr->children.size(); ++i) {
                        if (eval_args) {
                            args.push_back(eval_expr(expr->children[i]));
                        } else {
                            args.push_back(expr->children[i]);
                        }
                    }
                    return it->second(args);
                }

                return SExpr::make_atom("#<error: unknown command " + cmd_name + ">");
            }
        }
        return SExpr::make_nil();
    }

    std::string resolve_atom(std::shared_ptr<SExpr> e) const {
        if (!e) return "";
        if (e->type == SExpr::ATOM) return e->atom_val;
        if (e->type == SExpr::STRING) return e->atom_val;
        if (e->type == SExpr::LIST && e->children.size() == 2 &&
            e->children[0]->atom_val == "quote") {
            return e->children[1]->atom_val;
        }
        return e->to_string();
    }

    std::string resolve_string(std::shared_ptr<SExpr> e) const {
        if (!e) return "";
        if (e->type == SExpr::STRING || e->type == SExpr::ATOM) return e->atom_val;
        return e->to_string();
    }

    Handle resolve_handle(std::shared_ptr<SExpr> e) const {
        if (!e) return UNDEFINED_HANDLE;
        std::string s = e->atom_val;
        // Parse "#<atom:N>" or "#<link:N>"
        auto colon = s.find(':');
        if (colon != std::string::npos) {
            std::string num = s.substr(colon + 1);
            if (!num.empty() && num.back() == '>') num.pop_back();
            try { return static_cast<Handle>(std::stoul(num)); }
            catch (...) {}
        }
        // Try as plain number
        try { return static_cast<Handle>(std::stoul(s)); }
        catch (...) {}
        return UNDEFINED_HANDLE;
    }

    AtomType parse_atom_type(const std::string& name) const {
        if (name == "ConceptNode")    return AtomType::CONCEPT_NODE;
        if (name == "PredicateNode")  return AtomType::PREDICATE_NODE;
        if (name == "SchemaNode")     return AtomType::SCHEMA_NODE;
        if (name == "NumberNode")     return AtomType::NUMBER_NODE;
        if (name == "VariableNode")   return AtomType::VARIABLE_NODE;
        if (name == "InheritanceLink") return AtomType::INHERITANCE_LINK;
        if (name == "SimilarityLink") return AtomType::SIMILARITY_LINK;
        if (name == "EvaluationLink") return AtomType::EVALUATION_LINK;
        if (name == "ListLink")       return AtomType::LIST_LINK;
        if (name == "SetLink")        return AtomType::SET_LINK;
        if (name == "AndLink")        return AtomType::AND_LINK;
        if (name == "OrLink")         return AtomType::OR_LINK;
        if (name == "NotLink")        return AtomType::NOT_LINK;
        if (name == "BindLink")       return AtomType::BIND_LINK;
        if (name == "LambdaLink")     return AtomType::LAMBDA_LINK;
        if (name == "DefineLink")     return AtomType::DEFINE_LINK;
        return AtomType::NODE;
    }

    std::shared_ptr<SExpr> atom_to_sexpr(Handle h) const {
        const Atom* a = as_.get_atom(h);
        if (!a) return SExpr::make_nil();
        auto list = SExpr::make_list();
        list->children.push_back(SExpr::make_atom(atom_type_name(a->type)));
        if (a->is_node()) {
            list->children.push_back(SExpr::make_string(a->name));
        } else {
            for (auto oh : a->outgoing) {
                list->children.push_back(atom_to_sexpr(oh));
            }
        }
        // Add truth value
        auto tv_list = SExpr::make_list();
        tv_list->children.push_back(SExpr::make_atom("stv"));
        tv_list->children.push_back(SExpr::make_number(a->tv.strength));
        tv_list->children.push_back(SExpr::make_number(a->tv.confidence));
        list->children.push_back(tv_list);
        return list;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// JSON Serializer — Serialize AtomSpace to JSON
// ─────────────────────────────────────────────────────────────────────────────
class JSONSerializer {
public:
    explicit JSONSerializer(const AtomSpace& as) : as_(as) {}

    // Serialize entire AtomSpace
    std::string serialize() const {
        std::ostringstream os;
        os << "{\"atoms\":[";
        bool first = true;
        as_.foreach_atom([&](const Atom& a) {
            if (!first) os << ",";
            first = false;
            serialize_atom(os, a);
        });
        os << "],\"size\":" << as_.size() << "}";
        return os.str();
    }

    // Serialize single atom
    std::string serialize_atom_json(Handle h) const {
        const Atom* a = as_.get_atom(h);
        if (!a) return "null";
        std::ostringstream os;
        serialize_atom(os, *a);
        return os.str();
    }

    // Serialize as graph (for visualization)
    std::string serialize_graph() const {
        std::ostringstream os;
        os << "{\"nodes\":[";
        bool first = true;
        as_.foreach_atom([&](const Atom& a) {
            if (a.is_node()) {
                if (!first) os << ",";
                first = false;
                os << "{\"id\":" << a.handle
                   << ",\"name\":\"" << escape_json(a.name) << "\""
                   << ",\"type\":\"" << atom_type_name(a.type) << "\""
                   << ",\"tv\":{\"s\":" << a.tv.strength << ",\"c\":" << a.tv.confidence << "}"
                   << ",\"av\":{\"sti\":" << a.av.sti << "}"
                   << "}";
            }
        });
        os << "],\"links\":[";
        first = true;
        as_.foreach_atom([&](const Atom& a) {
            if (a.is_link() && a.outgoing.size() >= 2) {
                // Create edges between all pairs in outgoing
                for (size_t i = 0; i + 1 < a.outgoing.size(); ++i) {
                    if (!first) os << ",";
                    first = false;
                    os << "{\"source\":" << a.outgoing[i]
                       << ",\"target\":" << a.outgoing[i+1]
                       << ",\"type\":\"" << atom_type_name(a.type) << "\""
                       << ",\"id\":" << a.handle
                       << "}";
                }
            }
        });
        os << "]}";
        return os.str();
    }

private:
    const AtomSpace& as_;

    void serialize_atom(std::ostringstream& os, const Atom& a) const {
        os << "{\"handle\":" << a.handle
           << ",\"type\":\"" << atom_type_name(a.type) << "\""
           << ",\"is_node\":" << (a.is_node() ? "true" : "false");
        if (a.is_node()) {
            os << ",\"name\":\"" << escape_json(a.name) << "\"";
        }
        if (!a.outgoing.empty()) {
            os << ",\"outgoing\":[";
            for (size_t i = 0; i < a.outgoing.size(); ++i) {
                if (i > 0) os << ",";
                os << a.outgoing[i];
            }
            os << "]";
        }
        os << ",\"tv\":{\"strength\":" << a.tv.strength
           << ",\"confidence\":" << a.tv.confidence << "}"
           << ",\"av\":{\"sti\":" << a.av.sti
           << ",\"lti\":" << a.av.lti
           << ",\"vlti\":" << a.av.vlti << "}"
           << "}";
    }

    static std::string escape_json(const std::string& s) {
        std::string result;
        for (char c : s) {
            switch (c) {
                case '"':  result += "\\\""; break;
                case '\\': result += "\\\\"; break;
                case '\n': result += "\\n"; break;
                case '\t': result += "\\t"; break;
                default:   result += c; break;
            }
        }
        return result;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ThreadSafeAtomSpace — AtomSpace with spinlock protection
// ─────────────────────────────────────────────────────────────────────────────
class ThreadSafeAtomSpace {
public:
    Handle add_node(AtomType type, const std::string& name,
                    const TruthValue& tv = TruthValue(1.0f, 0.0f)) {
        Spinlock::Guard g(lock_);
        return as_.add_node(type, name, tv);
    }

    Handle add_link(AtomType type, const std::vector<Handle>& outgoing,
                    const TruthValue& tv = TruthValue(1.0f, 0.0f)) {
        Spinlock::Guard g(lock_);
        return as_.add_link(type, outgoing, tv);
    }

    const Atom* get_atom(Handle h) {
        Spinlock::Guard g(lock_);
        return as_.get_atom(h);
    }

    bool remove_atom(Handle h) {
        Spinlock::Guard g(lock_);
        return as_.remove_atom(h);
    }

    size_t size() {
        Spinlock::Guard g(lock_);
        return as_.size();
    }

    AtomSpace& unsafe_ref() { return as_; }

private:
    AtomSpace as_;
    Spinlock lock_;
};

}} // namespace cog::webvm

#endif // COG_WEBVM_HPP

// cog/webvm/expression_serial.hpp — Expression State Serialization for WebVM
// JSON serialization of MetaHuman DNA expression frames for web transport
// Header-only, C++11, zero external dependencies
// SPDX-License-Identifier: MIT
//
// Serializes ExpressionFrame data to JSON for:
// - WebSocket transport to Live2D/Three.js browser clients
// - REST API responses for avatar state queries
// - Debug logging and replay
//
#ifndef COG_WEBVM_EXPRESSION_SERIAL_HPP
#define COG_WEBVM_EXPRESSION_SERIAL_HPP

#include "../core/core.hpp"
#include <cstdint>
#include <string>
#include <sstream>
#include <unordered_map>
#include <vector>
#include <iomanip>

namespace cog { namespace webvm {

// ─────────────────────────────────────────────────────────────────────────────
// Minimal JSON builder (no external dependencies)
// ─────────────────────────────────────────────────────────────────────────────
class JsonBuilder {
public:
    JsonBuilder() : first_(true) { ss_ << "{"; }

    JsonBuilder& key_string(const std::string& k, const std::string& v) {
        comma(); ss_ << "\"" << escape(k) << "\":\"" << escape(v) << "\"";
        return *this;
    }

    JsonBuilder& key_number(const std::string& k, double v) {
        comma(); ss_ << "\"" << escape(k) << "\":" << std::fixed << std::setprecision(4) << v;
        return *this;
    }

    JsonBuilder& key_int(const std::string& k, int64_t v) {
        comma(); ss_ << "\"" << escape(k) << "\":" << v;
        return *this;
    }

    JsonBuilder& key_bool(const std::string& k, bool v) {
        comma(); ss_ << "\"" << escape(k) << "\":" << (v ? "true" : "false");
        return *this;
    }

    JsonBuilder& key_object(const std::string& k,
                            const std::unordered_map<std::string, float>& map) {
        comma();
        ss_ << "\"" << escape(k) << "\":{";
        bool f = true;
        for (const auto& kv : map) {
            if (!f) ss_ << ",";
            ss_ << "\"" << escape(kv.first) << "\":" << std::fixed
                << std::setprecision(4) << kv.second;
            f = false;
        }
        ss_ << "}";
        return *this;
    }

    JsonBuilder& key_array_float(const std::string& k, const float* data, size_t n) {
        comma();
        ss_ << "\"" << escape(k) << "\":[";
        for (size_t i = 0; i < n; ++i) {
            if (i > 0) ss_ << ",";
            ss_ << std::fixed << std::setprecision(4) << data[i];
        }
        ss_ << "]";
        return *this;
    }

    std::string build() {
        ss_ << "}";
        return ss_.str();
    }

private:
    std::ostringstream ss_;
    bool first_;

    void comma() {
        if (!first_) ss_ << ",";
        first_ = false;
    }

    static std::string escape(const std::string& s) {
        std::string result;
        result.reserve(s.size());
        for (char c : s) {
            switch (c) {
            case '"':  result += "\\\""; break;
            case '\\': result += "\\\\"; break;
            case '\n': result += "\\n"; break;
            case '\r': result += "\\r"; break;
            case '\t': result += "\\t"; break;
            default:   result += c; break;
            }
        }
        return result;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ExpressionSerializer — Serialize expression frames to JSON
// ─────────────────────────────────────────────────────────────────────────────
class ExpressionSerializer {
public:
    // Serialize morph targets and material params to JSON
    static std::string serialize_frame(
        uint64_t frame_number,
        const std::unordered_map<std::string, float>& morph_targets,
        const std::unordered_map<std::string, float>& material_params,
        double lyapunov_exponent,
        const std::string& cognitive_mode)
    {
        return JsonBuilder()
            .key_int("frame", static_cast<int64_t>(frame_number))
            .key_object("morph_targets", morph_targets)
            .key_object("material_params", material_params)
            .key_number("lyapunov_exponent", lyapunov_exponent)
            .key_string("cognitive_mode", cognitive_mode)
            .build();
    }

    // Serialize AU activations with FACS names
    static std::string serialize_au_state(
        const float au_values[20],
        size_t au_count = 20)
    {
        static const char* au_names[] = {
            "AU1_InnerBrowRaise", "AU2_OuterBrowRaise", "AU4_BrowLowerer",
            "AU5_UpperLidRaise", "AU6_CheekRaise", "AU7_LidTightener",
            "AU9_NoseWrinkle", "AU10_UpperLipRaise", "AU12_LipCornerPull",
            "AU14_Dimpler", "AU15_LipCornerDepress", "AU17_ChinRaise",
            "AU20_LipStretch", "AU23_LipTightener", "AU25_LipsPart",
            "AU26_JawDrop", "AU28_LipSuck", "AU43_EyesClosed",
            "AU45_Blink", "AU46_Wink"
        };

        JsonBuilder jb;
        for (size_t i = 0; i < au_count && i < 20; ++i) {
            if (au_values[i] > 0.001f) {
                jb.key_number(au_names[i], au_values[i]);
            }
        }
        return jb.build();
    }

    // Serialize for WebSocket binary protocol (compact)
    // Format: [frame:u32][num_targets:u8][target_id:u8, value:f16]...
    static std::vector<uint8_t> serialize_binary(
        uint32_t frame_number,
        const float au_values[20],
        size_t au_count = 20)
    {
        std::vector<uint8_t> buf;
        // Frame number (4 bytes, little-endian)
        buf.push_back(frame_number & 0xFF);
        buf.push_back((frame_number >> 8) & 0xFF);
        buf.push_back((frame_number >> 16) & 0xFF);
        buf.push_back((frame_number >> 24) & 0xFF);

        // Count active AUs
        uint8_t count = 0;
        for (size_t i = 0; i < au_count && i < 20; ++i) {
            if (au_values[i] > 0.001f) count++;
        }
        buf.push_back(count);

        // AU data (id:u8, value:u8 quantized to [0,255])
        for (size_t i = 0; i < au_count && i < 20; ++i) {
            if (au_values[i] > 0.001f) {
                buf.push_back(static_cast<uint8_t>(i));
                float clamped = (au_values[i] > 1.0f) ? 1.0f : au_values[i];
                buf.push_back(static_cast<uint8_t>(clamped * 255.0f));
            }
        }
        return buf;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ExpressionReplay — Record and replay expression frames
// ─────────────────────────────────────────────────────────────────────────────
class ExpressionReplay {
public:
    struct Frame {
        uint64_t number;
        float au_values[20];
        std::string json;
    };

    void record(uint64_t frame_num, const float au_values[20]) {
        Frame f;
        f.number = frame_num;
        for (int i = 0; i < 20; ++i) f.au_values[i] = au_values[i];
        f.json = ExpressionSerializer::serialize_au_state(au_values);
        frames_.push_back(f);
    }

    const Frame* get_frame(size_t index) const {
        return (index < frames_.size()) ? &frames_[index] : nullptr;
    }

    size_t frame_count() const { return frames_.size(); }

    void clear() { frames_.clear(); }

    // Export all frames as JSON array
    std::string export_json() const {
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < frames_.size(); ++i) {
            if (i > 0) ss << ",";
            ss << frames_[i].json;
        }
        ss << "]";
        return ss.str();
    }

private:
    std::vector<Frame> frames_;
};

}} // namespace cog::webvm

#endif // COG_WEBVM_EXPRESSION_SERIAL_HPP

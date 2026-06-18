import pandas as pd
import os

# ==========================================
# LOAD DATA
# ==========================================
df = pd.read_csv("PlasticRiverInputs.csv")
TOTAL_RIVERS = len(df)
print(f"Total Rivers loaded: {TOTAL_RIVERS}")

# ==========================================
# SORT & RANK
# ==========================================
df = df.sort_values("i_mid", ascending=False).reset_index(drop=True)
df["rank"] = range(1, TOTAL_RIVERS + 1)
df["percentile"] = ((TOTAL_RIVERS - df["rank"] + 1) / TOTAL_RIVERS) * 100

# ==========================================
# ACTIONABLE METRICS
# ==========================================
df["daily_leakage"] = df["i_mid"] / 365
df["priority_score"] = df["i_mid"]  # Base logic for interceptor placement

def classify_risk(percentile):
    if percentile >= 99: return "Extreme"
    elif percentile >= 90: return "High"
    elif percentile >= 70: return "Moderate"
    elif percentile >= 40: return "Low"
    else: return "Very Low"

df["risk_level"] = df["percentile"].apply(classify_risk)

# ==========================================
# GROUPING FOR HEATMAP LAYERS
# ==========================================
top100 = df.head(100).copy()
top100["group"] = "high"

bottom100 = df.tail(100).copy()
bottom100["group"] = "low"

combined = pd.concat([top100, bottom100])

# ==========================================
# EXPORT
# ==========================================
columns = [
    "X", "Y", "i_mid", "mpw", "area", "group", "rank", "percentile", 
    "risk_level", "daily_leakage", "priority_score",
    "i_mid_jan", "i_mid_feb", "i_mid_mar", "i_mid_apr", "i_mid_may", 
    "i_mid_jun", "i_mid_jul", "i_mid_aug", "i_mid_sep", "i_mid_oct", 
    "i_mid_nov", "i_mid_dec"
]

# Ensure the static directory exists
os.makedirs("static", exist_ok=True)
combined[columns].to_json("static/hotspots.json", orient="records")

print("Pipeline Complete. hotspots.json updated.")
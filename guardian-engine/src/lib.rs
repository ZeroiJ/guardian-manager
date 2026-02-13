use wasm_bindgen.prelude::*;
use std::collections::HashMap;

#[wasm_bindgen]
pub fn compare_stats(
    stats_a: JsValue,
    stats_b: JsValue
) -> Result<JsValue, JsValue> {
    let map_a: HashMap<String, i32> = serde_wasm_bindgen::from_value(stats_a)?;
    let map_b: HashMap<String, i32> = serde_wasm_bindgen::from_value(stats_b)?;
    
    let mut delta: HashMap<String, i32> = HashMap::new();
    
    // Union of keys
    let mut keys: Vec<&String> = map_a.keys().collect();
    for k in map_b.keys() {
        if !map_a.contains_key(k) {
            keys.push(k);
        }
    }
    
    for k in keys {
        let val_a = map_a.get(k).unwrap_or(&0);
        let val_b = map_b.get(k).unwrap_or(&0);
        delta.insert(k.clone(), val_b - val_a);
    }
    
    Ok(serde_wasm_bindgen::to_value(&delta)?)
}

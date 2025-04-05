"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { FileSpreadsheet, ListPlus } from "lucide-react";

// 🧠 Formatierungsfunktion für deutsche Währung
const formatCurrency = (value) => {
  const number = parseFloat(value);
  if (isNaN(number)) return "-";
  return number.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
};

export default function AfaApp() {
  const [data, setData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [assetValues, setAssetValues] = useState({});
  const [exportMessage, setExportMessage] = useState("");
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const isElectron = typeof window !== "undefined" && window.process && window.process.type;

    if (isElectron) {
      const fs = window.require("fs");
      const path = window.require("path");

      const jsonPath = path.resolve(__dirname, "..", "..", "afaClean.json");
      console.log("JSON-Pfad:", jsonPath);
      if (!fs.existsSync(jsonPath)) {
        console.error("Datei nicht gefunden:", jsonPath);
      }
      try {
        const jsonData = fs.readFileSync(jsonPath, "utf8");
        const parsed = JSON.parse(jsonData);
        setData(parsed);
      } catch (error) {
        console.error("Fehler beim Laden der lokalen JSON:", error);
      }
    } else {
      fetch("/afaClean.json")
        .then((res) => res.json())
        .then((data) => setData(data))
        .catch((error) => console.error("Fehler beim Laden der Daten (fetch):", error));
    }
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      const filtered = data.filter(
        (item) =>
          item["Wirtschaftszweig"] === selectedCategory &&
          item["Anlagegüter"]?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAssets(filtered);
    } else {
      setFilteredAssets([]);
    }
  }, [data, selectedCategory, searchTerm]);

  const handleValueChange = (index, value) => {
    setAssetValues({ ...assetValues, [index]: value });
  };

  const calculateAfa = (asset, value) => {
    let afaSatz = asset["Linearer AfA-Satz v.H."];
    if (!afaSatz && asset["Nutzungsdauer (ND) i.J."]) {
      const nutzungsdauer = parseFloat(asset["Nutzungsdauer (ND) i.J."]);
      if (!isNaN(nutzungsdauer) && nutzungsdauer > 0) {
        afaSatz = (100 / nutzungsdauer).toFixed(2);
      }
    } else if (afaSatz) {
      afaSatz = parseFloat(afaSatz).toFixed(2);
    }
    return value ? (parseFloat(value) * (afaSatz / 100)).toFixed(2) : "-";
  };

  const addToCart = (asset, index) => {
    const assetValue = parseFloat(assetValues[index]) || 0;
    setCart([
      ...cart,
      {
        ...asset,
        "Anschaffungswert (€)": assetValue,
        "Jährliche AfA (€)": calculateAfa(asset, assetValue),
      },
    ]);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(cart);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AfA Berechnung");
    XLSX.writeFile(wb, "afa_berechnung.xlsx");
    setExportMessage("Die Datei wurde erfolgreich gespeichert!");
    setTimeout(() => setExportMessage(""), 3000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto flex gap-6">
      <div className="w-2/3">
        <h1 className="text-2xl font-bold mb-4">AfA Abschreibungsrechner</h1>
        <Select onValueChange={setSelectedCategory}>
          <SelectTrigger>Wähle einen Wirtschaftszweig</SelectTrigger>
          <SelectContent>
            {data.length > 0 &&
              [...new Set(data.map((item) => item["Wirtschaftszweig"]))].map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {selectedCategory && (
          <Input
            className="mt-4 p-2 border rounded"
            type="text"
            placeholder="Nach Anlagegüter suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        )}

        <div className="mt-4">
          {filteredAssets.map((asset, index) => {
            const assetValue = assetValues[index] || "";
            return (
              <Card key={index} className="mb-2">
                <CardContent>
                  <p className="font-semibold">{asset["Anlagegüter"] || "Unbekanntes Anlagegut"}</p>
                  <p>Nutzungsdauer: {asset["Nutzungsdauer (ND) i.J."] || "-"} Jahre</p>
                  <p>AfA-Satz: {asset["Linearer AfA-Satz v.H."] || "-"}%</p>
                  <p>Jährliche AfA: {formatCurrency(calculateAfa(asset, assetValue))}</p>
                  <Input
                  className="mt-2"
                  inputMode="decimal"
                  placeholder="Anschaffungswert (€)"
                  defaultValue={assetValues[index] !== undefined && assetValues[index] !== "" ? assetValues[index].toString().replace(".", ",") : ""}
                  onBlur={(e) => {
                    const raw = e.target.value.replace(/\./g, "").replace(/,/g, ".");
                    const floatVal = parseFloat(raw);
                    const safeVal = isNaN(floatVal) ? "" : floatVal;
                    setAssetValues({ ...assetValues, [index]: safeVal });
                    if (!isNaN(floatVal)) {
                      e.target.value = formatCurrency(floatVal);
                    }
                  }}
                  onFocus={(e) => {
                    const current = assetValues[index];
                    if (!isNaN(current) && current !== "") {
                      e.target.value = current.toString().replace(".", ",");
                    }
                  }}
                />
                  <Button className="mt-2 flex items-center gap-2" onClick={() => addToCart(asset, index)}>
                    <ListPlus size={16} /> Hinzufügen
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <div className="w-1/3">
        <h2 className="text-xl font-bold mb-2">Zu extrahierende Daten</h2>
        {cart.map((item, idx) => (
          <Card key={idx} className="mb-2">
            <CardContent>
              <p className="font-semibold">{item["Anlagegüter"]}</p>
              <p>Nutzungsdauer: {item["Nutzungsdauer (ND) i.J."] || "-"} Jahre</p>
              <p>AfA-Satz: {item["Linearer AfA-Satz v.H."] || "-"}%</p>
              <p>Anschaffungswert: {formatCurrency(item["Anschaffungswert (€)"])}</p>
              <p>Jährliche AfA: {formatCurrency(item["Jährliche AfA (€)"])}</p>
              <Button className="mt-2 bg-red-500 text-white" onClick={() => removeFromCart(idx)}>
                Entfernen
              </Button>
            </CardContent>
          </Card>
        ))}
        <Button className="mt-4 flex items-center gap-2" onClick={exportToExcel}>
          <FileSpreadsheet size={16} /> Excel Export
        </Button>
      </div>
    </div>
  );
}

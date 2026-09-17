import os
import chromadb

# Ensure chroma stores data locally in a persistent folder
PERSIST_DIRECTORY = os.path.join(os.path.dirname(__file__), "../chroma_data")

def setup_chromadb():
    print(f"Initializing ChromaDB in {PERSIST_DIRECTORY}...")
    
    # 1. Connect to the Persistent Client
    client = chromadb.PersistentClient(path=PERSIST_DIRECTORY)
    
    # 2. Get or create the collection
    # We use get_or_create so we don't crash if it already exists
    collection = client.get_or_create_collection(
        name="watson_board_evidence_graph",
        metadata={"description": "Vector DB for the Living Evidence Canvas"}
    )
    
    # 3. Format your new evidence data
    documents = [
        # Victim & Autopsy
        "Victim R. Suresh. Age 34, Male. Cause of Death: Blunt force trauma to the occipital region resulting in depressed skull fracture and subdural hemorrhage. Estimated TOD: 19:30 - 21:00.",
        "Autopsy A-2041 Findings: Lungs congested (right 520g, left 473g). Liver 1418g showing mild steatosis. Stomach contains partially digested rice and vegetables, suggesting last meal was around 18:00.",
        "Toxicology Report T-2041: Blood alcohol concentration (BAC) 0.04%. Trace amounts of diazepam detected. No other illicit substances found.",
        "Post-mortem interval indicators: Algor mortis rectal temperature 20.4°C at 23:30. Rigor mortis developing in jaw and neck. Livor mortis fixed on posterior surfaces, inconsistent with the supine recovery position, suggesting post-mortem relocation.",
        
        # Suspects
        "Suspect Vetri (S-118). Age 39. Known drug supplier with prior convictions for assault. Financial link to victim established. DNA connection via crime scene blood trace.",
        "Suspect Manoj (S-204). Age 28. Co-worker of the victim. Last seen near TOD window. Claims he was at a cafe in Egmore during the incident, but witness accounts conflict.",
        
        # Physical Evidence
        "Evidence EV-008: Blunt Object (Recovered). A rusted iron rod weighing 600g. Recovered from a storm drain 100m from the primary scene. Blood typing matches victim (O+). Partial latent fingerprint lifted from the handle.",
        "Fingerprint Analysis FP-09: Partial latent print from iron rod matches right thumb of Suspect Vetri (S-118). 12 minutiae points matched.",
        "DNA Sample D-77: Blood spatter collected from a brick wall at the crime scene. STR profiling shows a 99.2% match with Suspect Vetri (S-118).",
        
        # Timeline & Digital Forensics
        "CCTV-CHN-0412: Camera located at Chennai Central E-Gate 4. Footage from 20:42 shows a physical altercation between the victim and an unidentified male matching S-118's description. 6 clear frames captured before subjects move out of frame.",
        "CCTV-CHN-0418: Camera near Royapuram transit hub. Timestamp shows 20:48, but station logs indicate a +6 minute clock drift. Forensic review confirms actual time of capture was 20:42. Victim visible walking alone.",
        "Financial Record FIN-992: UPI Transfer of ₹40,000 from Victim R. Suresh to Suspect Vetri (S-118) at 20:22. Transaction memo left blank. Bank logs confirm successful transfer.",
        "Digital Forensics: WhatsApp extraction from Victim's phone. Last message sent at 19:45 to S-118: 'I have the money, meet me at the usual spot.'",
        "Cell Tower Dump CDR-881: Victim's phone pinged the Park Town cell tower (Tower ID: 4492) continuously from 20:14 to 20:51, after which the signal was lost (likely device destroyed or powered off).",
        "Cell Tower Dump CDR-882: Suspect Vetri (S-118)'s phone pinged the exact same Park Town cell tower (Tower ID: 4492) starting at 20:22 and leaving the sector at 20:55. High probability of spatial overlap.",
        
        # Environmental & Witnesses
        "Witness Statement W-01 (Anandhi K.): Local tea stall owner. Reliable witness. Confirms seeing the victim near E-Gate 4 at 20:14, looking agitated and checking his watch frequently.",
        "Witness Statement W-02 (Auto Driver T.): Claims to have dropped Suspect Manoj (S-204) near the scene at 22:10. However, this contradicts S-204's phone GPS data which places him in Adyar at that time. Statement flagged as low reliability.",
        "Weather Log WX-22: Overcast conditions, low visibility. Temperature 27°C, humidity 88%. No precipitation during the estimated TOD window."
    ]
    
    metadatas = [
        {"node_id": "victim-1", "type": "victim", "confidence": 99},
        {"node_id": "autopsy-1", "type": "autopsy", "confidence": 95, "linked_to": "victim-1"},
        {"node_id": "tox-1", "type": "toxicology", "confidence": 99, "linked_to": "victim-1"},
        {"node_id": "pmi-1", "type": "autopsy", "confidence": 88, "linked_to": "victim-1"},
        
        {"node_id": "suspect-1", "type": "suspect", "confidence": 87, "linked_to": "victim-1"},
        {"node_id": "suspect-2", "type": "suspect", "confidence": 54, "linked_to": "victim-1"},
        
        {"node_id": "weapon-1", "type": "evidence", "confidence": 92, "linked_to": "victim-1"},
        {"node_id": "print-1", "type": "evidence", "confidence": 98, "linked_to": "suspect-1"},
        {"node_id": "dna-1", "type": "evidence", "confidence": 99, "linked_to": "suspect-1"},
        
        {"node_id": "cctv-1", "type": "timeline", "confidence": 90, "linked_to": "victim-1"},
        {"node_id": "cctv-2", "type": "timeline", "confidence": 47, "linked_to": "victim-1"},
        {"node_id": "financial-1", "type": "evidence", "confidence": 99, "linked_to": "suspect-1"},
        {"node_id": "digital-1", "type": "timeline", "confidence": 95, "linked_to": "suspect-1"},
        {"node_id": "phone-v1", "type": "timeline", "confidence": 99, "linked_to": "victim-1"},
        {"node_id": "phone-s1", "type": "evidence", "confidence": 95, "linked_to": "suspect-1"},
        
        {"node_id": "witness-1", "type": "environmental", "confidence": 92, "linked_to": "victim-1"},
        {"node_id": "witness-2", "type": "environmental", "confidence": 30, "linked_to": "suspect-2"},
        {"node_id": "weather-1", "type": "environmental", "confidence": 99, "linked_to": "victim-1"}
    ]
    
    ids = [f"node_{i}" for i in range(len(documents))]
    
    # 4. Upsert (Update or Insert) the data into the DB
    print("Upserting documents into ChromaDB...")
    collection.upsert(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )
    
    print("✅ Database successfully populated with graph relationships!")
    return collection

def query_chromadb(query_text: str, n_results: int = 2):
    """
    Demonstrates how to semantic search the database.
    """
    client = chromadb.PersistentClient(path=PERSIST_DIRECTORY)
    collection = client.get_collection(name="watson_board_evidence_graph")
    
    print(f"\n🔍 Querying DB for: '{query_text}'")
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results
    )
    
    for i, doc in enumerate(results['documents'][0]):
        meta = results['metadatas'][0][i]
        dist = results['distances'][0][i]
        print(f"\n--- Result {i+1} (Distance: {dist:.4f}) ---")
        print(f"Document: {doc}")
        print(f"Metadata: {meta}")

if __name__ == "__main__":
    # When you run this file directly, it will setup the DB and run a test query.
    setup_chromadb()
    
    query_chromadb("What evidence connects the victim to a blunt force trauma?")
    query_chromadb("Show me the financial transactions involving the primary suspect.")

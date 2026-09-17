import pandas as pd
import os

CSV_PATH = os.path.join(os.path.dirname(__file__), '../../dataset/forensic_autopsy_3000.csv')

class AutopsyService:
    def __init__(self):
        try:
            self.df = pd.read_csv(CSV_PATH)
            # Fill NaNs with empty string or None for JSON serialization
            self.df = self.df.fillna("")
        except Exception as e:
            print(f"Error loading CSV: {e}")
            self.df = pd.DataFrame()

    def get_all_autopsies(self, limit: int = 50, skip: int = 0):
        if self.df.empty:
            return []
        
        paginated_df = self.df.iloc[skip:skip+limit]
        return paginated_df.to_dict(orient='records')

    def get_autopsy_by_cpr(self, cpr_number: str):
        if self.df.empty:
            return None
        
        match = self.df[self.df['CPR Number'] == cpr_number]
        if not match.empty:
            return match.iloc[0].to_dict()
        return None

autopsy_service = AutopsyService()

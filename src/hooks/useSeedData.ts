import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateSampleData } from "@/lib/sampleData";

/**
 * Seeds the database with sample traffic data if it's empty.
 * Called once from the app root on first load.
 */
export function useSeedData() {
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    const seed = async () => {
      // Check if data exists
      const { count } = await supabase
        .from('traffic_data')
        .select('*', { count: 'exact', head: true });

      if ((count ?? 0) === 0) {
        const records = generateSampleData();
        // Insert in chunks of 100
        for (let i = 0; i < records.length; i += 100) {
          await supabase.from('traffic_data').insert(records.slice(i, i + 100));
        }
      }
      setSeeded(true);
    };
    seed();
  }, []);

  return seeded;
}

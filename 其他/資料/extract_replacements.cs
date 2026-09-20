using System;
using System.IO;
using System.Collections.Generic;

class Program
{
    static void Main()
    {
        string transcriptPath = @"..\..\brain\e0c23eb0-ebf9-4a25-8b12-766f659ee509\.system_generated\logs\transcript_full.jsonl";
        if (!File.Exists(transcriptPath)) return;

        string[] lines = File.ReadAllLines(transcriptPath);
        using (StreamWriter writer = new StreamWriter("extracted_patch.txt"))
        {
            foreach (var line in lines)
            {
                if (line.Contains("\"name\":\"multi_replace_file_content\"") || line.Contains("\"name\":\"replace_file_content\""))
                {
                    if (line.Contains("app.js"))
                    {
                        string[] targets = line.Split(new string[] { "\"TargetContent\":\"" }, StringSplitOptions.None);
                        for (int i = 1; i < targets.Length; i++)
                        {
                            int endIdx = targets[i].IndexOf("\",\"ReplacementContent\"");
                            if (endIdx > 0)
                            {
                                string target = targets[i].Substring(0, endIdx);
                                target = target.Replace("\\n", "\n").Replace("\\r", "\r").Replace("\\\"", "\"").Replace("\\\\", "\\");
                                
                                string remain = targets[i].Substring(endIdx);
                                int repStart = remain.IndexOf("\"ReplacementContent\":\"") + 22;
                                if (repStart >= 22)
                                {
                                    int repEnd = remain.IndexOf("\",\"StartLine\"", repStart);
                                    if (repEnd == -1) repEnd = remain.IndexOf("\"}", repStart);
                                    
                                    if (repEnd > 0)
                                    {
                                        string rep = remain.Substring(repStart, repEnd - repStart);
                                        rep = rep.Replace("\\n", "\n").Replace("\\r", "\r").Replace("\\\"", "\"").Replace("\\\\", "\\");
                                        
                                        writer.WriteLine("<<<< TARGET");
                                        writer.WriteLine(target);
                                        writer.WriteLine("==== REPLACEMENT");
                                        writer.WriteLine(rep);
                                        writer.WriteLine(">>>>");
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

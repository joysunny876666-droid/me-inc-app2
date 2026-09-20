using System;
using System.IO;
using System.Text.RegularExpressions;

class Program
{
    static void Main()
    {
        string transcriptPath = @"..\..\brain\e0c23eb0-ebf9-4a25-8b12-766f659ee509\.system_generated\logs\transcript_full.jsonl";
        if (!File.Exists(transcriptPath)) return;

        string[] lines = File.ReadAllLines(transcriptPath);
        using (StreamWriter writer = new StreamWriter("extracted_commands.txt"))
        {
            foreach (var line in lines)
            {
                if (line.Contains("\"CommandLine\":\""))
                {
                    string[] parts = line.Split(new string[] { "\"CommandLine\":\"" }, StringSplitOptions.None);
                    for (int i = 1; i < parts.Length; i++)
                    {
                        int endIdx = parts[i].IndexOf("\",\"Cwd\"");
                        if (endIdx > 0)
                        {
                            string cmd = parts[i].Substring(0, endIdx);
                            cmd = cmd.Replace("\\n", "\n").Replace("\\r", "\r").Replace("\\\"", "\"").Replace("\\\\", "\\");
                            writer.WriteLine("==================");
                            writer.WriteLine(cmd);
                        }
                    }
                }
            }
        }
    }
}

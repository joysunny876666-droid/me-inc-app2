$transcriptPath = '..\..\brain\e0c23eb0-ebf9-4a25-8b12-766f659ee509\.system_generated\logs\transcript_full.jsonl'
Get-Content $transcriptPath -Encoding UTF8 | ForEach-Object {
    if ($_ -match '"name":"multi_replace_file_content"' -or $_ -match '"name":"replace_file_content"') {
        if ($_ -match 'app\.js') {
            try {
                $obj = $_ | ConvertFrom-Json
                foreach ($tc in $obj.tool_calls) {
                    if ($tc.name -eq 'multi_replace_file_content' -and $tc.args.TargetFile -match 'app\.js') {
                        foreach ($chunk in $tc.args.ReplacementChunks) {
                            Write-Output "<<<< TARGET"
                            Write-Output $chunk.TargetContent
                            Write-Output "==== REPLACEMENT"
                            Write-Output $chunk.ReplacementContent
                            Write-Output ">>>>"
                        }
                    } elseif ($tc.name -eq 'replace_file_content' -and $tc.args.TargetFile -match 'app\.js') {
                        Write-Output "<<<< TARGET"
                        Write-Output $tc.args.TargetContent
                        Write-Output "==== REPLACEMENT"
                        Write-Output $tc.args.ReplacementContent
                        Write-Output ">>>>"
                    }
                }
            } catch {
                # Ignore errors
            }
        }
    }
}

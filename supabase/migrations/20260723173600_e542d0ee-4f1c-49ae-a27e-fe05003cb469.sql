
CREATE POLICY "auth upload wish media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'wish-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "auth read wish media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'wish-media');
CREATE POLICY "anon read wish media" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'wish-media');
CREATE POLICY "owner delete wish media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'wish-media' AND (storage.foldername(name))[1] = auth.uid()::text);
